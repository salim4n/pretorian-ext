import { useState, useEffect } from 'react'
import './App.css'
import * as tf from '@tensorflow/tfjs'
import * as tfjsConverter from '@tensorflow/tfjs-converter'

const classNames = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush"
];

function App() {
  const [model, setModel] = useState<tf.GraphModel | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await tfjsConverter.loadGraphModel('./yolov8n_web_model/model.json')
        console.log("Modèle chargé avec succès")
        setModel(model)
        setLoading(false)
      } catch (error) {
        console.error("Erreur lors du chargement du modèle :", error)
      }
    };
    loadModel();
  }, []);

  const detectObjects = async (model: tf.GraphModel, image: HTMLImageElement) => {
    const tensorImage = tf.browser.fromPixels(image)
    const resizedImage = tf.image.resizeBilinear(tensorImage, [640, 640])
    const tensor = resizedImage.expandDims(0).toFloat().div(tf.scalar(255))

    console.log("Tenseur d'image :", tensor)
    
    try {
      const predictions = model.execute(tensor)
      const [boxes, scores, classes] =  [predictions] as tf.Tensor[]
      console.log("Prédictions :", boxes, scores, classes)
      const boxesData = boxes.dataSync()
      const scoresData = scores.dataSync()
      const classesData = classes.dataSync()
      const confidenceThreshold = 0.5
      const validDetections = []
      for (let i = 0; i < scoresData.length; i++) {
          if (scoresData[i] > confidenceThreshold) {
              validDetections.push({
                  box: boxesData.slice(i * 4, (i + 1) * 4),
                  score: scoresData[i],
                  class: classesData[i]
              })
      }
    // Display results
      validDetections.forEach(detection => {
      const [x, y, width, height] = detection.box
      const score = detection.score
      const className = detection.class

      // Draw bounding box and label on the image
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")
      if(ctx) {
      ctx.drawImage(image, 0, 0)
      ctx.strokeStyle = "red"
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
      ctx.font = "24px Arial"
      ctx.fillStyle = "red"
      ctx.fillText(`${classNames[className]}: ${score.toFixed(2)}`, x, y - 10)
      const dataUrl = canvas.toDataURL()
      const newImage = new Image()
      newImage.src = dataUrl
      // download the image
      const link = document.createElement("a")
      link.download = "image.jpg"
      link
      .setAttribute("href", dataUrl)
      link.click()
      link.remove()
      }
  })
    }
    } catch (error) {
      console.error("Erreur lors de la détection :", error)
    } finally {
      tensorImage.dispose()
      tensor.dispose()
      resizedImage.dispose()
    }
  };



  const captureVisibleTab = () => {
    chrome.tabs.captureVisibleTab({}, async function (dataUrl) {
      console.log("Capture de l'onglet visible")
      const image = new Image()
      image.src = dataUrl
      image.onload = async () => {
        if (model) {
          console.log("Image chargée, détection des objets en cours");
          await detectObjects(model, image)
        }
      };
      setTimeout(() => {
        image.remove()
      }, 5000) // Augmentez cet intervalle pour réduire la fréquence des captures
    });
  };

  const startCapturing = () => {
    console.log("Démarrage de la capture")
    captureVisibleTab()
    setInterval(captureVisibleTab, 5000) // Capture toutes les 5 secondes
  };

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="card">
      <button onClick={startCapturing}>Capture</button>
      </div>
    )
}

export default App;
