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
      script.src = "https://unpkg.com/three@0.161.0/build/three.min.js";
      script.async = true;
      script.onload = () => resolve(window.THREE);
      script.onerror = () => reject(new Error("Unable to load Three.js"));
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
  texture.needsUpdate = true;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
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
  const [loadError, setLoadError] = useState("");

  const graphData = useMemo(() => {
    const conceptNodes = nodes.filter(
      (node) => node.id.startsWith("node_") && node.id.split("_").length === 2
    );

    const root = topic || "Topic";

    return {
      root,
      conceptNodes: conceptNodes.slice(0, 18),
      edges,
    };
  }, [nodes, edges, topic]);

  useEffect(() => {
    let isMounted = true;
    let cleanup = () => {};

    const init = async () => {
      try {
        const THREE = await loadThree();
        if (!isMounted || !containerRef.current || !THREE) {
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

        const ambient = new THREE.AmbientLight(0x88aaff, 0.7);
        scene.add(ambient);
        const pointLight = new THREE.PointLight(0x7dd3fc, 1.4, 80);
        pointLight.position.set(8, 6, 12);
        scene.add(pointLight);

        const graphGroup = new THREE.Group();
        scene.add(graphGroup);

        const stars = new THREE.Group();
        for (let i = 0; i < 180; i += 1) {
          const star = new THREE.Mesh(
            new THREE.SphereGeometry(0.02 + Math.random() * 0.04, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x9fb8ff })
          );
          star.position.set(
            (Math.random() - 0.5) * 45,
            (Math.random() - 0.5) * 26,
            (Math.random() - 0.5) * 35
          );
          stars.add(star);
        }
        scene.add(stars);

        const rootMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 48, 48),
          new THREE.MeshPhongMaterial({
            color: 0x2563eb,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.4,
            shininess: 100,
          })
        );
        rootMesh.userData = { concept: graphData.root };
        graphGroup.add(rootMesh);

        const rootLabel = createTextSprite(THREE, graphData.root);
        if (rootLabel) {
          rootLabel.position.set(0, -1.9, 0);
          graphGroup.add(rootLabel);
        }

        const conceptObjects: any[] = [];
        const radius = 6;

        graphData.conceptNodes.forEach((node, index) => {
          const angle = (index / Math.max(graphData.conceptNodes.length, 1)) * Math.PI * 2;
          const vertical = Math.sin(index * 0.8) * 1.9;

          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 28, 28),
            new THREE.MeshPhongMaterial({
              color:
                activeConcept.toLowerCase() === node.label.toLowerCase()
                  ? 0x38bdf8
                  : 0x93c5fd,
              emissive:
                activeConcept.toLowerCase() === node.label.toLowerCase()
                  ? 0x0ea5e9
                  : 0x1d4ed8,
              emissiveIntensity: 0.28,
              shininess: 90,
            })
          );

          mesh.position.set(Math.cos(angle) * radius, vertical, Math.sin(angle) * radius);
          mesh.userData = { concept: node.label };

          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), mesh.position.clone()]),
            new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 })
          );

          graphGroup.add(mesh);
          graphGroup.add(line);

          const label = createTextSprite(THREE, node.label);
          if (label) {
            label.position.copy(mesh.position.clone().add(new THREE.Vector3(0, -1, 0)));
            graphGroup.add(label);
          }

          conceptObjects.push(mesh);
        });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onPointerDown = (event: PointerEvent) => {
          const bounds = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersections = raycaster.intersectObjects(conceptObjects);
          if (intersections.length > 0) {
            const concept = intersections[0].object?.userData?.concept;
            if (concept) {
              onConceptClick(concept);
            }
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
        let frame = 0;

        const animate = () => {
          frame = requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();

          graphGroup.rotation.y += 0.0025;
          rootMesh.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.05);
          stars.rotation.y += 0.0008;

          conceptObjects.forEach((object, index) => {
            object.position.y += Math.sin(elapsed * 1.2 + index) * 0.0022;
          });

          renderer.render(scene, camera);
        };

        animate();

        cleanup = () => {
          cancelAnimationFrame(frame);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("resize", onResize);
          container.innerHTML = "";
          renderer.dispose();
        };
      } catch (error) {
        console.error("Three.js mindmap initialization failed", error);
        if (isMounted) {
          setLoadError("Could not load 3D mindmap in this environment.");
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [graphData, activeConcept, onConceptClick]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-[560px] w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 shadow-[0_0_35px_rgba(59,130,246,0.35)]"
      />
      {loadError ? (
        <p className="text-xs text-destructive">{loadError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Drag to inspect the 3D scene and click concept nodes to open evidence.
        </p>
      )}
    </div>
  );
};
