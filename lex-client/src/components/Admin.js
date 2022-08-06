import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import Users from './Users';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
//import axios from '../api/axios';

const placeholder = `
{
  "segments": [
    {
      "id": 0,
      "sentences": [
        {
          "ordinal": 0,
          "text": "test text",
          "speaker": 0
        }
      ]
    }
  ],
  "title": "test title",
  "publisher": "test publisher",
  "uploader": "test uploader"
}
`

const Admin = () => {
  const axios = useAxiosPrivate()

  const [source, setSource] = useState(undefined)
  const [sources, setSources] = useState([])
  const [newSource, setNewSource] = useState("")

  const refreshSources = async() => {
    const response = await axios.get("/v1/sources/original",
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false
      })
    setSources(response.data)
  }

  useState(() => {
    refreshSources()
  }, [])

  const selectSource = async(value) => {
    console.log("selectSource", value)
    setSource(value)
  };

  const deleteSource = async() => {
    if (!source) return
    try {
      const response = await axios.delete("/v1/source/original/" + source,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true 
        })
      alert(`Successfully deleted the source with ID "${source}"`)
      setSource(undefined)
      refreshSources()
    } catch(err) { 
      console.error(err)
      alert("Failed to delete the source. Try again later.")
    }
  };

  const uploadSource = async() => {
    if (!newSource) return
    try {
      const response = await axios.post("/v1/source/original",
        newSource,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true 
        })
      alert(`Successfully uploaded a new source entitled "${JSON.parse(newSource).title}"`)
      refreshSources()
    } catch(err) { 
      console.error(err)
      alert("Failed to upload the new source. Check your formatting.")
    }
    setNewSource("")
  };

  const onChangeSource = (e) => {
    setNewSource(e.target.value)
  }

  return (
    <section>
      <h1>Admins Page</h1>
      <br />
      <Users />
      <br />
      <h2>Sources List</h2>
      <select name="sources" id="sources" onChange={e => selectSource(e.target.value)}>
       {sources.map(({item1, item2}) => {
        return (<option key={item1} value={item1}>{item2}</option>)
       })}
      </select>
      <button disabled={!source} onClick={deleteSource}>Delete Source</button>
      <br/>
      <textarea placeholder={placeholder} spellCheck="false" style={{fontSize: 11}} rows="10" cols="50" onChange={onChangeSource} value={newSource}/>
      <button disabled={!newSource} onClick={uploadSource}>Upload Source</button>
      <button onClick={refreshSources}>Refresh Sources</button>
      <br />
      <div className="flexGrow">
        <Link to="/">Home</Link>
      </div>
    </section>
  )
}

export default Admin
