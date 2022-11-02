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
          maxSize={-500}
          defaultSize={parseInt(localStorage.getItem("splitPos"), 10)}
          onChange={(size) => localStorage.setItem("splitPos", size)}
        >
          <div
            style={{
              backgroundColor: "cornflowerblue",
              height: "1000 px",
              border: "3% solid black",
            }}
          >
            <h2>Shalma Wegsman Our Featured Artist</h2>
          </div>
          <div
            style={{
              backgroundColor: "pink",

              font: "utopia_seriff",

              border: "3% solid black",
            }}
          >
            <h2>She is: </h2>
            <h2>
              -a physicist
              <br />
              -a game engineer
              <br />
              -a 3d engineer
              <br />
              -a XR engineer
            </h2>
            <h2>
              Check out her Podcast with Dan Hooper
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://podcasts.apple.com/us/podcast/why-this-universe/id1523312400"
              >
                <p> Why This Universe </p>
              </a>
              It makes the deepest concepts in physics digestible.
            </h2>
          </div>
          <div
            style={{
              backgroundColor: "red",

              font: "utopia_seriff",

              border: "3% solid black",
            }}
          >
            Check it Out!
          </div>
        </SplitPane>
      </div>
      <div className="other-guy">
        <p> Stay tuned for the next exhibit in this Online </p>
      </div>
      <div className="footer">
        <Footer />
      </div>
    </div>
  );
}

export default App;
