import { useEffect, useMemo, useRef, useState } from "react";

type MindMapNode = {
  id: string;
  label: string;
};

type MindMapEdge = {
  from: string;
  to: string;
};

type MindMapThreeProps = {
  topic: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  activeConcept: string;
  onConceptClick: (concept: string) => void;
};

declare global {
  interface Window {
    THREE?: any;
    __nexasenseThreeLoader?: Promise<any>;
  }
}

const loadThree = async () => {
  if (window.THREE) {
    return window.THREE;
  }

  if (!window.__nexasenseThreeLoader) {
    window.__nexasenseThreeLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/three.min.js";
      script.async = true;
      script.onload = () => resolve(window.THREE);
      script.onerror = () => reject(new Error("Unable to load Three.js from local asset."));
      document.head.appendChild(script);
    });
  }

  return window.__nexasenseThreeLoader;
};

const createTextSprite = (THREE: any, text: string) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  canvas.width = 512;
  canvas.height = 128;
  context.fillStyle = "rgba(18, 24, 34, 0.65)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(120, 180, 255, 0.8)";
  context.lineWidth = 6;
  context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  context.font = "bold 44px Inter, sans-serif";
  context.fillStyle = "#e6f1ff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 28), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.9, 0.75, 1);
  return sprite;
};

export const MindMapThree = ({
  topic,
  nodes,
  edges,
  activeConcept,
  onConceptClick,
}: MindMapThreeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isThreeUnavailable, setIsThreeUnavailable] = useState(false);

  const graphData = useMemo(() => {
    const conceptNodes = nodes
      .filter((node) => node.id.startsWith("node_") && node.id.split("_").length === 2)
      .slice(0, 18);

    return {
      root: topic || "Topic",
      conceptNodes,
      edges,
    };
  }, [nodes, edges, topic]);

  useEffect(() => {
    if (isThreeUnavailable) {
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    const init = async () => {
      try {
        const THREE = await loadThree();
        if (!THREE || !containerRef.current || disposed) {
          return;
        }

        const container = containerRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#030712");

        const camera = new THREE.PerspectiveCamera(
          58,
          container.clientWidth / Math.max(container.clientHeight, 1),
          0.1,
          1000
        );
        camera.position.set(0, 0, 15);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0x88aaff, 0.7));
        const pointLight = new THREE.PointLight(0x7dd3fc, 1.4, 80);
        pointLight.position.set(8, 6, 12);
        scene.add(pointLight);

        const graphGroup = new THREE.Group();
        scene.add(graphGroup);

        const rootMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 48, 48),
          new THREE.MeshPhongMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.4 })
        );
        graphGroup.add(rootMesh);

        const rootLabel = createTextSprite(THREE, graphData.root);
        if (rootLabel) {
          rootLabel.position.set(0, -1.9, 0);
          graphGroup.add(rootLabel);
        }

        const conceptObjects: any[] = [];
        const lines: any[] = [];
        const radius = 6;

        graphData.conceptNodes.forEach((node, index) => {
          const angle = (index / Math.max(graphData.conceptNodes.length, 1)) * Math.PI * 2;
          const y = Math.sin(index * 0.8) * 1.9;
          const position = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 28, 28),
            new THREE.MeshPhongMaterial({
              color: activeConcept.toLowerCase() === node.label.toLowerCase() ? 0x38bdf8 : 0x93c5fd,
              emissive: 0x1d4ed8,
              emissiveIntensity: 0.28,
            })
          );
          mesh.position.copy(position);
          mesh.userData = { concept: node.label };

          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), position]),
            new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 })
          );

          graphGroup.add(mesh);
          graphGroup.add(line);
          conceptObjects.push(mesh);
          lines.push(line);

          const label = createTextSprite(THREE, node.label);
          if (label) {
            label.position.copy(position.clone().add(new THREE.Vector3(0, -1, 0)));
            graphGroup.add(label);
          }
        });

        if (graphData.edges.length > 0) {
          const nodeMap = new Map<string, any>();
          conceptObjects.forEach((mesh) => nodeMap.set(mesh.userData.concept, mesh.position));
          graphData.edges.slice(0, 30).forEach((edge) => {
            const fromLabel = nodes.find((n) => n.id === edge.from)?.label;
            const toLabel = nodes.find((n) => n.id === edge.to)?.label;
            if (!fromLabel || !toLabel) {
              return;
            }
            const fromPoint = nodeMap.get(fromLabel);
            const toPoint = nodeMap.get(toLabel);
            if (!fromPoint || !toPoint) {
              return;
            }

            const secondaryLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([fromPoint.clone(), toPoint.clone()]),
              new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16 })
            );
            graphGroup.add(secondaryLine);
            lines.push(secondaryLine);
          });
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onPointerDown = (event: PointerEvent) => {
          const bounds = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersections = raycaster.intersectObjects(conceptObjects);
          const concept = intersections[0]?.object?.userData?.concept;
          if (concept) {
            onConceptClick(concept);
          }
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);

        const onResize = () => {
          if (!containerRef.current) {
            return;
          }
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          camera.aspect = width / Math.max(height, 1);
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        window.addEventListener("resize", onResize);

        const clock = new THREE.Clock();
        let frameId = 0;

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          const t = clock.getElapsedTime();

          graphGroup.rotation.y += 0.0025;
          rootMesh.scale.setScalar(1 + Math.sin(t * 1.8) * 0.05);
          lines.forEach((line, index) => {
            line.material.opacity = 0.15 + ((Math.sin(t + index * 0.3) + 1) / 2) * 0.3;
          });

          renderer.render(scene, camera);
        };

        animate();

        cleanup = () => {
          cancelAnimationFrame(frameId);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("resize", onResize);
          renderer.dispose();
          container.innerHTML = "";
        };
      } catch {
        if (!disposed) {
          setIsThreeUnavailable(true);
        }
      }
    };

    init();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [graphData, activeConcept, onConceptClick, isThreeUnavailable, nodes]);

  return (
    <div className="space-y-2">
      {!isThreeUnavailable ? (
        <div
          ref={containerRef}
          className="h-[560px] w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 shadow-[0_0_35px_rgba(59,130,246,0.35)]"
        />
      ) : (
        <div className="h-[560px] w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
          <svg className="h-full w-full" viewBox="-360 -260 720 520">
            <defs>
              <radialGradient id="fallbackRoot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
            </defs>

            <circle cx="0" cy="0" r="50" fill="url(#fallbackRoot)" />
            <text x="0" y="5" textAnchor="middle" className="fill-white text-[13px] font-semibold">
              {graphData.root}
            </text>

            {graphData.conceptNodes.map((node, index) => {
              const angle = (index / Math.max(graphData.conceptNodes.length, 1)) * Math.PI * 2;
              const x = Math.cos(angle) * 190;
              const y = Math.sin(angle) * 190;
              const selected = activeConcept.toLowerCase() === node.label.toLowerCase();

              return (
                <g key={node.id} onClick={() => onConceptClick(node.label)} style={{ cursor: "pointer" }}>
                  <line x1={0} y1={0} x2={x} y2={y} stroke="#60a5fa" strokeOpacity="0.45" strokeWidth="1.5" />
                  <circle cx={x} cy={y} r={selected ? 32 : 27} fill={selected ? "#0ea5e9" : "#93c5fd"} fillOpacity="0.82" />
                  <text x={x} y={y + 4} textAnchor="middle" className="fill-slate-900 text-[10px] font-semibold">
                    {node.label.slice(0, 13)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isThreeUnavailable
          ? "Three.js asset not found in this deployment, so an interactive fallback map is shown."
          : "Drag to inspect the 3D scene and click concept nodes to open evidence."}
      </p>
    </div>
  );
};
