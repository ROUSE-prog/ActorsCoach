// src/components/VideoStream.js
import React, { useEffect, useRef, useState } from 'react';
import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs';

const VideoStream = () => {
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false); // Camera starts turned off
  const [isFlipped, setIsFlipped] = useState(false); // To flip the video
  const [volume, setVolume] = useState(1); // Control audio volume
  const [selectedBackground, setSelectedBackground] = useState('none'); // Background filter
  const [uploadedImage, setUploadedImage] = useState(null); // Store uploaded image
  const [model, setModel] = useState(null); // BodyPix model
  const [isVideoReady, setIsVideoReady] = useState(false); // Ensure video is loaded
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    // Load the BodyPix model
    const loadModel = async () => {
      const bpModel = await bodyPix.load();
      setModel(bpModel);
    };
    loadModel();
  }, []);

  const handleLoadedMetadata = () => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (videoElement && canvasElement) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      setIsVideoReady(true); // Indicate video is ready for processing
    }
  };

  useEffect(() => {
    if (model && stream && isVideoReady) {
      processVideo();
    }
  }, [model, stream, isVideoReady, selectedBackground, uploadedImage]);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(currentStream => {
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setIsCameraOn(true);
      })
      .catch(err => console.error('Error accessing webcam: ', err));
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          setUploadedImage(img); // Set the uploaded image once it's fully loaded
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const processVideo = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    // Ensure the video and canvas have non-zero dimensions
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return;
    }

    const segmentation = await model.segmentPerson(videoElement, {
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
    });

    const ctx = canvasElement.getContext('2d');
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // If user uploaded an image, draw it as the background
    if (uploadedImage) {
      ctx.drawImage(uploadedImage, 0, 0, canvasElement.width, canvasElement.height);
    } else if (selectedBackground === 'color') {
      ctx.fillStyle = '#3498db'; // Example color
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }

    // Draw the person mask on top of the background
    const mask = bodyPix.toMask(segmentation);
    ctx.putImageData(mask, 0, 0);

    requestAnimationFrame(processVideo);
  };

  return (
    <div className="flex flex-row h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-glass p-6 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Camera Settings</h2>

        {/* Background Filter Selection */}
        <div>
          <label>Select Background: </label>
          <select onChange={(e) => setSelectedBackground(e.target.value)} value={selectedBackground}>
            <option value="none">None</option>
            <option value="color">Color</option>
            <option value="image">Image</option>
          </select>
        </div>

        {/* Camera Controls */}
        <button className="btn btn-primary w-full mb-4" onClick={toggleCamera}>
          {isCameraOn ? 'Stop Camera' : 'Start Camera'}
        </button>

        {/* Flip Camera */}
        <button className="btn btn-secondary w-full mb-4" onClick={handleFlip}>
          Flip Camera {isFlipped ? 'On' : 'Off'}
        </button>

        {/* Volume Control */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Volume Control</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="range range-primary"
          />
        </div>

        {/* Background Image Upload */}
        <div>
          <label className="block mb-2 text-sm font-medium">Upload a Background Image</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input file-input-bordered file-input-primary w-full" />
        </div>
      </div>

      {/* Video Stream and Canvas for Background Filter */}
      <div style={{ position: 'relative', width: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          onLoadedMetadata={handleLoadedMetadata} // Ensure dimensions are set once the video loads
          style={{
            width: '100%',
            height: 'auto',
            transform: isFlipped ? 'scaleX(-1)' : 'scaleX(1)', // Flip the video horizontally
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default VideoStream;
