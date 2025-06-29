import "../styles/global.css";


// Add this to your pages/_app.js file
BigInt.prototype.toJSON = function() {
  return this.toString();
};

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}