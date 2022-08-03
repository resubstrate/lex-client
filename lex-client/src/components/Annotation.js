import { Link } from "react-router-dom"
import React, { useEffect, useState, useRef } from "react";
import axios from '../api/axios';
const test = require("../test.json")

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
  const {w, h} = useWindowDimensions()

  const [source, setSource] = useState(test)
  const [userSummaries, setUserSummaries] = useState(Array(source.segments.length).fill(""))
  const [otherSentences, setOtherSentences] = useState(Array(source.segments.length).fill([]))

  const editSummary = (index, value) => {
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

  const submit = (e) => {
    (async () => {
    console.log("submit")
    let sourceWordCount = 0
    for (const segment of source.segments) {
      for (const sentence of segment.sentences) {
        sourceWordCount += sentence.text.split(" ").length
      }
    }
    const sourceSegmentCount = source.segments.length
    const content = userSummaries.join(" ")
    const response = await axios.post("/v1/source/segmentWithCompression",
      JSON.stringify({ content, sourceWordCount, sourceSegmentCount, idealCompression: 0.65 }),
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
    })()
  }

  return (
    <div style={{backgroundColor: c.background, width: "100%"}}>
    <div style={{backgroundColor: c.foreground, margin: "3%", padding: "3%", borderRadius: 5, width: "94%"}}>
       {source.segments.map((segment, index) => {
        return (
          <div style={{fontSize: 16}}>
            <div style={{display: "flex"}}>
              <div style={{flex: 5, textAlign: "justify"}}>
                <div style={{color: c.darkText}}>{`Segment ${index + 1}`}</div>
                <br/>
                <div key={index}>{segment.sentences.map(s => {
                  const style = {color: s.speaker_id == 1 ? c.pinkText : c.greenText}
                  return <span style={style}><sup>{`${s.ordinal + 1}`}</sup>{s.text}</span>
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
