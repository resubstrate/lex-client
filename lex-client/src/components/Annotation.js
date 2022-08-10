import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const { auth } = useContext(AuthContext);
  const annotatorId = auth.user

  const {w, h} = useWindowDimensions()

  const [annotation, setAnnotation] = useState(undefined)

    const navigate = useNavigate();
  const location = useLocation();

  const getAnnotation = async() => {
    //    const a9id = location.search.split("?id=")[1]
    // the proper way doesn't work, so screw it
    let a9id = (`${window.location}`).split("?id=")[1]
    if (a9id == "undefined") a9id = undefined

    if (!a9id) {
      a9id = localStorage.getItem("a9id")
      if (a9id == "undefined") a9id = undefined
      console.log("got last annotation", a9id)
    } else {
      console.log("set last annotation", a9id)
      localStorage.setItem("a9id", a9id)
    }
    if (!a9id) {
      console.log("no annotation found")
      localStorage.removeItem("a9id")
      navigate("/")
      return
    }
    const response = await axios.get("/v1/annotation/" + a9id,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      })
    console.log("got annotation", response.data)
    for (let a9 of response.data.annotations) {
      if (!a9.annotationSummary) {
        a9.annotationSummary = {
          // TODO add other fields
          segments: [],
        }
        for (let idx = 0; idx < a9.annotationSource.segments.length; idx++) {
          a9.annotationSummary.segments.push({
            id: idx + 1,
            sourceSegmentId: idx + 1,
            segmentText: "",
            sentences: [],
            sourceSentences: [],
          })
        }
      }
    }
    let newA9 = response.data
    let oldA9 = localStorage.getItem("a9-" + newA9.id)
    if (oldA9 && oldA9 != "undefined") {
      oldA9 = JSON.parse(oldA9)
      console.log("got local a9 for " + newA9.id, oldA9)
      newA9 = oldA9
    }
    setAnnotation(newA9)
  }

  useEffect(() => {
    getAnnotation()
  }, [])

  const getLastA9 = (edit) => {
    return (edit || annotation)
      .annotations[annotation.annotations.length - 1]
  }

  const editSummary = (index, value) => {
    if (!annotation) return
    console.log("editSummary", index, value)
    const newA9 = annotation
    getLastA9(newA9).annotationSummary.segments[index].segmentText = value
    getLastA9(newA9).annotationSummary.segments[index].sourceSentences = getLastA9(newA9).annotationSummary.segments[index].sourceSentences || []
    getLastA9(newA9).annotationSummary.segments[index].sentences
      = value.split(/[\\.!\?]/).filter(s => s != "").map((sentence, si) => {
        return {
          ordinal: si,
          text: sentence.trim(),
          speaker: 0,
        }
      });
    console.log("stored local a9 for " + newA9.id)
    localStorage.setItem("a9-" + newA9.id, JSON.stringify(newA9))
    setAnnotation(newA9)
    console.log("editSummary", getLastA9(newA9).annotationSummary.segments[index])
  }

  const editOtherSentences = (index, value) => {
    if (!annotation) return
    console.log("editOtherSentences", index, value)
    getLastA9().annotationSummary
      .segments[index]
      .sourceSentences = value
    setAnnotation(annotation)
  }

  let clearStateFuncs = []
  const clearState = () => {
    for (const f of clearStateFuncs) {
      f()
    }
  }

  const submit = (e) => {
    (async () => {
    if (!annotation) return
    const req = {
      segments: getLastA9().annotationSummary.segments,
      annotatorId,
      annotationId: annotation.id,
      annotationSourceId: annotation.id,
      sourceSegmentCount: getLastA9().annotationSummary.segments.length,
      idealCompression: 0.4,
      depth: getLastA9().depth + 1,
    }
    try {
      const response = await axios.post("/v1/segment",
        JSON.stringify(req),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false
        })
      localStorage.removeItem("a9-" + annotation.id)
      await getAnnotation()
    } catch(err) {
      console.error(err)
      alert("Something went wrong. Please try again later.")
    }
    })()
  }

  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  if (!annotation) {
    return (
      <div style={{backgroundColor: c.background, width: "100%"}}>
        <div style={{backgroundColor: c.foreground, margin: "3%", padding: "3%", borderRadius: 5, width: "94%"}}>
          Loading...
        </div>
      </div>
    )
  }
  if (getLastA9().annotationSource.segments.length <= 1) {
    return (
      <div style={{backgroundColor: c.background, width: "100%"}}>
        <div style={{backgroundColor: c.foreground, margin: "3%", padding: "3%", borderRadius: 5, width: "94%"}}>
          This annotation is complete.
        </div>
      </div>
    )
  }
  return (
    <div style={{backgroundColor: c.background, width: "100%"}}>
    <div style={{backgroundColor: c.foreground, margin: "3%", padding: "3%", borderRadius: 5, width: "94%"}}>
      {getLastA9().annotationSource.segments.map((segment, index) => {
        const onChangeSummary = (e) => {
          const newValue = e.target.value.replace(/\n/g, '').replace("  ", " ")
          editSummary(index, newValue)
          forceUpdate()  // idk why I need this but I do
        }
        const summaryValue = getLastA9().annotationSummary.segments[index].segmentText
        if (index == 0) {
          console.log({summaryValue})
        }
        return (
          <div key={index} style={{fontSize: 16}}>
            <div style={{display: "flex"}}>
              <div style={{flex: 5, textAlign: "justify"}}>
                <div style={{color: c.darkText}}>{`Segment ${index + 1}`}</div>
                <br/>
                <div>{segment.sentences.map((s, si) => {
                  let style
                  if (s.speaker == 1) style = {color: c.pinkText}
                  else if (s.speaker == 2) style = {color: c.greenText}
                  return <span key={si} style={style}><sup>{`${s.ordinal + 1}`}</sup>{s.text}</span>
                })}</div>
              </div>
              <div style={{flex: 0.5}}/>
              <div style={{flex: 6}}>
                <div style={{color: c.darkText}}>{`Segment Summary ${index + 1}`}</div>
                <br/>
                <textarea spellCheck="true" style={{backgroundColor: c.input, color: c.lightText, fontSize: 14}} rows="10" cols="50" onChange={onChangeSummary} value={summaryValue}/>
                <br/>
                <br/>
                <div style={{color: c.darkText}}>{`Other Sentences Used, Enter separated by a comma ','`}</div>
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
       {getLastA9().annotationSource.segments.length > 0 ? (<button onClick={submit}>Submit</button>) : (<div>All done!</div>)}
    </div>
    </div>
  )
}

export default Annotation
