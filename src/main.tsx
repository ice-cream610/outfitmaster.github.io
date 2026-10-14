import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {MvpApp} from './mvp/App';
import {useState,useEffect} from 'react';
import './styles.css';
import './mvp/styles.css';
function Entry(){const [legacy,setLegacy]=useState(location.hash==='#legacy');useEffect(()=>{const update=()=>setLegacy(location.hash==='#legacy');addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update)},[]);return legacy?<><a style={{display:'block',padding:12,textAlign:'center',background:'#eee4d4'}} href="#">返回新商城与推荐 Agent</a><App/></>:<MvpApp/>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Entry/></React.StrictMode>);
