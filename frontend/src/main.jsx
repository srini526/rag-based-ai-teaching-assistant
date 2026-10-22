import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "highlight.js/styles/github-dark.css";
//import "highlight.js/styles/atom-one-dark.css";
//import "highlight.js/styles/github.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
