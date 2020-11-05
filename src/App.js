import React from "react";
import ReactDOM from "react-dom";
// import Split from "react-split";
import SplitPane from "react-split-pane";
import "./App.css";
import Title from "./Title";
import "./Title.css";
import Footer from "./components/Footer";
import "./components/Footer.css";

function App() {
  return (
    <div className="container">
      <div className="title">
        <Title />
      </div>
      <div className="content">
        <SplitPane
          split="vertical"
          minSize={20}
          maxSize={-200}
          defaultSize={parseInt(localStorage.getItem("splitPos"), 10)}
          onChange={(size) => localStorage.setItem("splitPos", size)}
        >
          <div
            style={{
              backgroundColor: "red",
              height: "2fr",
              border: "3% solid black",
            }}
          >
            <h2>This Area is Highly Toggleable</h2>
          </div>
          <div
            style={{
              backgroundColor: "yellow",

              font: "utopia_seriff",

              border: "3% solid black",
            }}
          >
            <h2>
              We love these
              <a target="_blank" href="http://chillcastle.com/art">
                <p>Artists</p>
              </a>
              They have shown with us in the past.
            </h2>
          </div>
          <div
            style={{
              backgroundColor: "Blue",

              font: "utopia_seriff",

              border: "3% solid black",
            }}
          >
            <h2>
              OLD SHOWS
              <a target="_blank" href="http://chillcastle.com/art">
                <p>PAST</p>
              </a>
              They have shown with us in the past.
            </h2>
          </div>
        </SplitPane>
      </div>
      <div className="footer">
        <Footer />
      </div>
    </div>
  );
}

export default App;
