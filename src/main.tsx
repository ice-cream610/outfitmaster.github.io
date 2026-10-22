import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {MvpApp} from './mvp/App';
import {Commerce} from './curated/Commerce';
import {useState,useEffect} from 'react';
import './styles.css';
import './mvp/styles.css';
import './curated/styles.css';
import './curated/dopamine.css';
function Entry(){const [route,setRoute]=useState(location.hash);useEffect(()=>{const update=()=>setRoute(location.hash);addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[]);return route==='#legacy'?<App/>:route==='#agent-lab'?<MvpApp/>:<Commerce/>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Entry/></React.StrictMode>);
