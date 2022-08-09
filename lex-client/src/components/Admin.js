import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import AuthContext from "../context/AuthProvider";
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

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const Admin = () => {
  const axios = useAxiosPrivate()

  const [source, setSource] = useState(undefined)
  const [sources, setSources] = useState([])
  const [newSource, setNewSource] = useState("")
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(undefined);
  const [a9s, setA9s] = useState([])
  const [a9, setA9] = useState(undefined)

  const refreshSources = async () => {
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
  }

  const refreshUsers = async() => {
    const response = await axios.get('/v1/user/users', {
//      signal: controller.signal
    });
    setUsers(response.data.map(u => u.userName));
    if (response.data.length > 0) {
      setUser(response.data[0].userName)
    }
  }

  useEffect(() => {
    (async () => {
      if (!user || !source) {
        setA9s([])
        return
      }
      const response = (await axios.get("/v1/annotations/annotator/" + user,
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
      console.log({newA9s, response, source})
      setA9s(newA9s)
      setA9(newA9s.length > 0 ? newA9s[0] : undefined)
    })();
  }, [user, source])

  const refreshAll = async() => {
    await refreshSources()
    await refreshUsers()
  }

  useEffect(() => {
    refreshAll()
  }, [])

  const selectSource = async(id) => {
    for (const src of sources) {
      if (src.id == id) {
        console.log("set source", src)
        setSource(src)
        return
      }
    }
  };

  const deleteUserA9s = async() => {
    console.log("deleteUserA9s", {user})
    if (!user) return
    if (!window.confirm(`Are you sure sure you want to delete all of ${user}'s annotations?`)) { return }
    const response = await axios.delete(`/v1/annotation/${user}`,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true 
      })
    refreshAll()
  }

  const downloadUserA9 = async() => {
    if (!user || !a9) return
    download(`${a9.id}.json`, JSON.stringify(a9))
  }

  const deleteUserA9 = async() => {
    if (!user || !a9) return
    if (!window.confirm(`Are you sure sure you want to delete annotation ${a9.id} by ${user}?`)) { return }
    const response = await axios.delete(`/v1/annotation/${user}/${a9.id}`,
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true 
      })
    refreshAll()
  }

  const deleteSource = async() => {
    if (!source) return
    if (!window.confirm(`Are you sure sure you want to delete source "${source.title}"?`)) { return }
    try {
      const response = await axios.delete("/v1/source/original/" + source.id,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true 
        })
      alert(`Successfully deleted the source with ID "${source.id}"`)
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

  const selectA9 = (id) => {
    for (const newA9 of a9s) {
      if (newA9 && newA9.id == id) {
        setA9(newA9)
        console.log("selected a9", newA9.id)
        return
      }
    }
  }

  return (
    <section>
      <h1>Admins Page</h1>
      <br />
      <h2>Users List</h2>
      <select name="users" id="users" onChange={e => setUser(e.target.value)}>
       {users.map(user => {
        return (<option key={user} value={user}>{user}</option>)
       })}
      </select>
      <button disabled={!user} onClick={deleteUserA9s}>{"Delete User's Annotations"}</button>
      <br />
      <h2>Sources List</h2>
      <select name="sources" id="sources" onChange={e => selectSource(e.target.value)}>
        {sources.map(src => {
          return (<option key={src.id} value={src.id}>{src.title}</option>)
        })}
      </select>
      <button disabled={!source} onClick={deleteSource}>Delete Source</button>
      <br/>
      <span>Annotations by this user from this source</span>
      <select style={{width: "100%"}} name="a9s" id="a9s" onChange={e => selectA9(e.target.value)}>
        {a9s.map(a9 => {
          if (!a9) {
            return (<option key={"new"} value={"new"}>{"create new"}</option>)
          }
          return (<option key={a9.id} value={a9.id}>{`last updated ${a9.timestamp}`}</option>)
        })}
      </select>
      <button disabled={!a9 || !user} onClick={downloadUserA9}>Download Annotation</button>
      <button disabled={!a9 || !user} onClick={deleteUserA9}>Delete Annotation</button>
      <br/>
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
