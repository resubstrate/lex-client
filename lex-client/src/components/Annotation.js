import { Link } from "react-router-dom"
import React, { useEffect, useContext, useState, useRef } from "react";
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import AuthContext from "../context/AuthProvider";

const c = {
  foreground: "#2E2E2E",
  background: "#121212",
  input: "#5F5F5F",
  lightText: "#DFDFDF",
  darkText: "#868686",
  pinkText: "#FC70FF",
  greenText: "#01EEC3",
}

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    w: width,
    h: height,
  };
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

const SummaryInputView = (props) => {
  const [value, setValue] = useState("")

  const onChange = (e) => {
    const newValue = e.target.value.replace(/\n/g, '').replace("  ", " ")
    setValue(newValue)
    props.onChange(newValue)
  }

  props.addClearState(() => {
    setValue("")
  })

  return (
    <div>
      <textarea spellCheck="true" style={{backgroundColor: c.input, color: c.lightText, fontSize: 14}} rows="10" cols="50" onChange={onChange} value={value}/>
    </div>
  )
}

const ListInputView = (props) => {
  const [value, setValue] = useState("")

  const onChange = (e) => {
    const newValue = e.target.value.replace(/[^0-9, ]/g, '').replace(/,([^ ])/g, ", $1")
    setValue(newValue)
    props.onChange([...new Set(newValue.split(",").map(s => parseInt(s.replace(" ", ""))).filter(o => o))])
  }

  props.addClearState(() => {
    setValue("")
  })

  return (
    <div>
      <input style={{borderRadius: 4, padding: 3, border: "none", width: "60%", backgroundColor: c.input, color: c.lightText}} onChange={onChange} value={value}/>
    </div>
  )
}

const Annotation = () => {
  const axios = useAxiosPrivate()

  const {w, h} = useWindowDimensions()

  const [annotation, setAnnotation] = useState(undefined)
  const [source, setSource] = useState({segments: []})
  const [sources, setSources] = useState([])
  const [userSummaries, setUserSummaries] = useState(Array(source.segments.length).fill(""))
  const [otherSentences, setOtherSentences] = useState(Array(source.segments.length).fill([]))
  const { auth } = useContext(AuthContext);

  const initAnnotation = async() => {
    console.log("initAnnotation", {authUser: auth.user, source, annotation})
    if (!source.id || annotation || !auth.user) return
    const annotatorId = auth.user
    const sourceId = source.id
    const response = await axios.post("/v1/annotation",
      JSON.stringify({ annotatorId, sourceId }),
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false
      })
    console.log("initAnnotation response", response.data)
    const a =  {id: response.data.annotationId}
    setAnnotation(a)
  }

  const getAnnotation = async(source2) => {
    if (!source2) {
      source2 = source
    }
    console.log("getAnnotation", {authUser: auth.user, source: source2})
    if (!auth.user || !source2) return
    const response = (await axios.get(`/v1/annotations/annotator/${auth.user}`,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      })).data
    console.log("getAnnotations response", response)
    let entries = response.filter(o => o.originalSourceId == source2.id && o.annotations)
    console.log("getAnnotations entries", entries)
    if (entries.length < 1) return
    // sort by updateTime desc
    entries.sort((a, b) => (new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()))
    let entry = entries[0]
    console.log("getAnnotations chosen entry", entry)
    // sort by depth desc
    entry.annotations.sort((a, b) => b.depth - a.depth)
    let newAnnotation = entry.annotations[0]
    console.log("getAnnotations newAnnotation", newAnnotation)
    setAnnotation(newAnnotation)
    setSource(newAnnotation.annotationSource)
  }

  const setSegment = async() => {
    console.log("setSegment", {source: source, annotation, authUser: auth.user})
    if (!source.id || !annotation || !auth.user) return
    const segments = userSummaries.map((s, idx) => {
      return {
        segmentText: s,
        sourceSentences: otherSentences[idx],
        sourceSegmentId: idx + 1,
        id: idx + 1,
      }
    })
    const req = {
        annotatorId: auth.user,
        annotationId: annotation.annotationSource.annotationId,
        annotationSourceId: source.id, //annotation.annotationSource.id,
        idealCompression: 0.65,
        depth: annotation.depth || 0,
        segments,
      }
    console.log("v1/segment req", req)
    const response = await axios.post("/v1/segment",
      JSON.stringify(req),
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false
      })
    const a = response.data
    console.log("setSegment setAnnotation", a)
    setAnnotation(a)
  }

  useState(() => {
    ;(async () => {
      const response = await axios.get("/v1/sources/original",
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false
        })
      console.log("sources", response.data)
      setSources(response.data)
      if (response.data) {
        selectSource(response.data[0].item1)
      }
    })();
  }, [])

  const editSummary = async (index, value) => {
    console.log("editSummary", index, value)
    userSummaries[index] = value
    setUserSummaries(userSummaries)
  }

  const editOtherSentences = (index, value) => {
    console.log("editOtherSentences", index, value)
    otherSentences[index] = value
    setOtherSentences(otherSentences)
  }

  let clearStateFuncs = []
  const clearState = () => {
    for (const f of clearStateFuncs) {
      f()
    }
  }

  const submit = async (e) => {
    await getAnnotation()
    await initAnnotation()
    return await setSegment()

    // TODO old stuff below
    let sourceWordCount = 0
    for (const segment of source.segments) {
      for (const sentence of segment.sentences) {
        sourceWordCount += sentence.text.split(" ").length
      }
    }
    const sourceSegmentCount = source.segments.length
    const content = userSummaries.join(" ")
    const response = await axios.post("/v1/segmentWithCompression",
      JSON.stringify({
        content,
        sourceWordCount,
        sourceSegmentCount,
        idealCompression: 0.65,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false
      })
    let newSource = {segments: response?.data}
    if (sourceSegmentCount == 1) {
      newSource = {segments: []}
    }
    console.log("newSource", newSource)
    setSource(newSource)
    setUserSummaries(Array(source.segments.length).fill(""))
    setOtherSentences(Array(source.segments.length).fill([]))
    clearState()
  }

  const selectSource = async(value) => {
    const response = await axios.get("/v1/source/original/" + value,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false
      })
    console.log("selectSource", response.data)
    setSource(response.data)
    setAnnotation(undefined)
    await getAnnotation(response.data)
    clearState()
  };

  return (
    <div style={{backgroundColor: c.background, width: "100%"}}>
    <select name="sources" id="sources" onChange={e => selectSource(e.target.value)}>
      {sources.map(({item1, item2}) => {
        return (<option key={item1} value={item1}>{item2}</option>)
      })}
    </select>
    <div style={{backgroundColor: c.foreground, margin: "3%", padding: "3%", borderRadius: 5, width: "94%"}}>
       {source.segments.map((segment, index) => {
        return (
          <div style={{fontSize: 16}}>
            <div style={{display: "flex"}}>
              <div style={{flex: 5, textAlign: "justify"}}>
                <div style={{color: c.darkText}}>{`Segment ${index + 1}`}</div>
                <br/>
                <div key={index}>{segment.sentences.map((s, si) => {
                  let style
                  if (s.speaker_id == 1) style = {color: c.pinkText}
                  else if (s.speaker_id == 2) style = {color: c.greenText}
                  return <span key={si} style={style}><sup>{`${s.ordinal + 1}`}</sup>{s.text}</span>
                })}</div>
              </div>
              <div style={{flex: 0.5}}/>
              <div style={{flex: 6}}>
                <div style={{color: c.darkText}}>{`Segment Summary ${index + 1}`}</div>
                <br/>
                <SummaryInputView addClearState={f => {clearStateFuncs.push(f)}} onChange={(v) => {editSummary(index, v)}}/>
                <br/>
                <br/>
                <div style={{color: c.darkText}}>{`Other Sentences Used, Enter separated by a comma ',' no space.`}</div>
                <br/>
                <ListInputView addClearState={f => {clearStateFuncs.push(f)}} onChange={(v) => {editOtherSentences(index, v)}}/>
              </div>
            </div>
            <br/>
            <div style={{height: 2, backgroundColor: c.background, width: "100%"}}/>
            <br/>
          </div>
        )
       })}
       {source.segments.length > 0 ? (<button onClick={submit}>Submit</button>) : (<div>All done!</div>)}
    </div>
    </div>
  )
}

export default Annotation
