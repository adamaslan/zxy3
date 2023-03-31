import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Text } from "@react-three/drei";

function RotatingSphere() {
  // Create a reference to the sphere
  const sphereRef = useRef();

  // Use the useFrame hook to animate the sphere
  useFrame((state) => {
    // Rotate the sphere on the x and y axes
    sphereRef.current.rotation.x += 0.01;
    sphereRef.current.rotation.y += 0.01;

    // Revolve the sphere around the center of the page
    // Use the state.clock to get the elapsed time in seconds
    // Use Math.sin and Math.cos to calculate the x and z coordinates
    // Use a radius variable to control the distance from the center
    const radius = 2.25;
    const angle = state.clock.getElapsedTime();
    sphereRef.current.position.x = radius * Math.sin(angle);
    sphereRef.current.position.z = radius * Math.cos(angle) * 1.5;
  });

  // Return the JSX element for the sphere
  return (
    <Sphere ref={sphereRef} args={[0.75, 32, 32]} position={[0, 0, 0]}>
      <meshStandardMaterial color="red" metalness={1} />
      {/* Add a Text component as a child of the Sphere */}
      {/* Use a negative offset on the y axis to position it on one side of the sphere */}
      {/* Use a small font size and depth to fit the text on the surface of the sphere */}
      {/* Use a black color and a bevel to make the text stand out */}
      <Text
        position={[1.5, -0.5, 0]}
        fontSize={0.75}
        depthOffset={5}
        color="red"
        bevelEnabled
      >
        ZXY
      </Text>
    </Sphere>
  );
}

function SplashScreen() {
  // Return the JSX element for the splash screen
  return (
    <Canvas
      style={{
        position: "absolute",
        top: "20%", // move the canvas down by 50%
        transform: "translateY(-50%)", // center the canvas vertically
        height: "80vh", // set the height to 80% of the viewport height
        width: "100%", // set the width to 100% of the parent element
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <RotatingSphere position={[0, 2, 0]} />
    </Canvas>
  );
}

export default SplashScreen;
