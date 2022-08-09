import useAxiosPrivate from '../hooks/useAxiosPrivate';
import AuthContext from "../context/AuthProvider";
import React, { useEffect, useContext, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Annotator = () => {
  const axios = useAxiosPrivate()
  const { auth } = useContext(AuthContext);
  const annotatorId = auth.user
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [sources, setSources] = useState([])
  const [source, setSource] = useState(undefined)
  const [a9s, setA9s] = useState([undefined])
  const [a9, setA9] = useState(undefined)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    ;(async () => {
      // Get the sources
      const response = await axios.get("/v1/sources/original",
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false
        })
      const sourceIds = response.data.map(s => s.item1)
      const fullSources = await Promise.all(sourceIds.map(id => {
        return (async () => {
          const response = await axios.get("/v1/source/original/" + id,
            {
              headers: { 'Content-Type': 'application/json' },
              withCredentials: false
            })
          return response.data
        })();
      }))
      const sourceIdIdx = {}
      sourceIds.map((id, idx) => {
        sourceIdIdx[id] = idx
      })
      fullSources.sort((a, b) => {return sourceIdIdx[a.id] - sourceIdIdx[b.id]})
      setSources(fullSources)
      if (fullSources.length > 0) {
        setSource(fullSources[0])
      }
    })();
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!source) return
      // Get the annotations for this source
      const response = (await axios.get("/v1/annotations/annotator/" + annotatorId,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        })).data
      // filter out other sources, create coalesced ts, sort by ts desc
      const newA9s = response
        .filter(a9 => a9.originalSourceId == source.id)
        .map(a9 => {
          a9.createTime = new Date(a9.createTime)
          a9.updateTime = new Date(a9.updateTime)
          if (a9.createTime.getTime() > a9.updateTime.getTime()) {
            a9.timestamp = a9.createTime
          } else {
            a9.timestamp = a9.updateTime
          }
          return a9 
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      console.log("got annotations", response)
      setA9s([undefined, ...newA9s])
      setA9(undefined)
    })();
  }, [source])

  const selectSource = (id) => {
    for (const src of sources) {
      if (src.id == id) {
        console.log("set source", src)
        setSource(src)
        return
      }
    }
  }

  const selectA9 = (id) => {
    if (id == "new") {
      setA9(undefined)
      console.log("selected new a9")
      return
    }
    for (const newA9 of a9s) {
      if (newA9 && newA9.id == id) {
        setA9(newA9)
        console.log("selected a9", newA9.id)
        return
      }
    }
  }

  const submit = async() => {
    if (!source) return
    console.log("submit", {a9})
    setSubmitted(true)
    let id = ''
    if (a9 && a9.id) {
      id = "?id=" + a9.id
    } else {
      const response = await axios.post("/v1/annotation",
        JSON.stringify({
          annotatorId, sourceId: source.id,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        })
      id = "?id=" + response.data.annotationId
    }
    navigate(`/annotation${id}`);
  }

  return (
    <section>
      <h1>Annotators Page</h1>
      <br />
      <p>Your annotations can be found here</p>
      1. Pick a source:
      <select name="sources" id="sources" onChange={e => selectSource(e.target.value)}>
        {sources.map(src => {
          return (<option key={src.id} value={src.id}>{src.title}</option>)
        })}
      </select>
      {source && (<div>
          2. Select an annotation, or create a new one:<br/>
          <select style={{width: "100%"}} name="a9s" id="a9s" onChange={e => selectA9(e.target.value)}>
            {a9s.map(a9 => {
              if (!a9) {
                return (<option key={"new"} value={"new"}>{"create new"}</option>)
              }
              return (<option key={a9.id} value={a9.id}>{`last updated ${a9.timestamp}`}</option>)
            })}
          </select>
          <button disabled={submitted || !source} onClick={submit}>annotate</button>
        </div>)}
      <div className="flexGrow">
        <Link to="/">Home</Link>
      </div>
    </section>
  )
}

export default Annotator
