import { useState, useEffect } from 'react';
import './App.css';
import * as tf from '@tensorflow/tfjs';
import * as tfjsConverter from '@tensorflow/tfjs-converter';

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
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await tfjsConverter.loadGraphModel('./yolov8n_web_model/model.json');
        console.log("Modèle chargé avec succès");
        setModel(model);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du modèle :", error);
      }
    };
    loadModel();
  }, []);

  const detectObjects = async (model: tf.GraphModel, image: HTMLImageElement) => {
    const tensorImage = tf.browser.fromPixels(image);
    const resizedImage = tf.image.resizeBilinear(tensorImage, [640, 640]);
    const tensor = resizedImage.expandDims(0).toFloat().div(tf.scalar(255));

    console.log("Tenseur d'image :", tensor);
    
    try {
      const rawPredictions = model.execute(tensor) as tf.Tensor;
      const rawData = await rawPredictions.array();
      console.log("Prédictions brutes :", rawData);
      const processedPredictions = processPredictions(rawData as any);
      console.log("Prédictions traitées :", processedPredictions);
      setPredictions(processedPredictions);
    } catch (error) {
      console.error("Erreur lors de la détection :", error);
    } finally {
      tensorImage.dispose();
      tensor.dispose();
      resizedImage.dispose();
    }
  };

  const processPredictions = (rawData: number[][][]): any[] => {
    console.log("Traitement des prédictions :", rawData);

    // Les données sont dans rawData[0], chaque élément de rawData[0] est un tableau de 8400 valeurs
    const boxes = rawData[0][0];
    const scores = rawData[0][4];
    const classes = rawData[0].slice(5);

    const results = [];
    for (let i = 0; i < boxes.length; i++) {
      const box = Number(boxes[i].toString().slice(0,4))// Les 4 premières valeurs représentent la boîte de délimitation
      const score = scores[i]; // La 5ème valeur représente le score
      const classScores = classes.map(cls => cls[i]);
      const maxClassIdx = classScores.indexOf(Math.max(...classScores)); // Index de la classe avec le score le plus élevé

      results.push({
        box,
        score,
        class: classNames[maxClassIdx] // Nom de la classe avec le score le plus élevé
      });
    }

    console.log("Résultats après traitement :", results);
    return results;
  };

  const captureVisibleTab = () => {
    chrome.tabs.captureVisibleTab({}, async function (dataUrl) {
      console.log("Capture de l'onglet visible");
      const image = new Image();
      image.src = dataUrl;
      image.onload = async () => {
        if (model) {
          console.log("Image chargée, détection des objets en cours");
          await detectObjects(model, image);
        }
      };
      setTimeout(() => {
        image.remove();
      }, 5000); // Augmentez cet intervalle pour réduire la fréquence des captures
    });
  };

  const startCapturing = () => {
    console.log("Démarrage de la capture");
    captureVisibleTab();
    setInterval(captureVisibleTab, 5000); // Capture toutes les 5 secondes
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="card">
      <button onClick={startCapturing}>Capture</button>
      <div>
        {predictions.length > 0 ? (
          predictions.map((prediction, index) => (
            <div key={index}>
              <h2>Prediction {index + 1}</h2>
              <pre>{JSON.stringify(prediction, null, 2)}</pre>
            </div>
          ))
        ) : (
          <div>No predictions available</div>
        )}
      </div>
    </div>
  );
}

export default App;
