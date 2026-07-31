import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	PerspectiveCamera,
	Points,
	Scene,
	ShaderMaterial,
	WebGLRenderer,
} from "three";
import { damp, fieldPositions, fieldSizes, parallaxTarget, renderScale } from "@/lib/three/field";
import { STARFIELD_FRAGMENT, STARFIELD_VERTEX } from "@/lib/three/shaders";
import { accentColour } from "@/lib/three/tokens";

/**
 * The ambient field behind the app. Everything that can be reasoned about — the scatter, the easing, the
 * parallax — lives in `field.ts` and is unit tested; this file is the part that needs a GPU.
 */

export interface StarfieldOptions {
	count?: number;
	spread?: number;
	depth?: number;
	opacity?: number;
	/** How far the camera leans towards the pointer, in world units. */
	parallax?: number;
}

export interface Starfield {
	/** Pausing releases the frame loop entirely rather than rendering to a hidden tab. */
	setRunning: (running: boolean) => void;
	dispose: () => void;
}

const DEFAULTS = {
	count: 900,
	spread: 34,
	depth: 120,
	opacity: 0.5,
	parallax: 2.4,
} satisfies Required<StarfieldOptions>;

export function createStarfield(canvas: HTMLCanvasElement, options: StarfieldOptions = {}): Starfield | null {
	const settings = { ...DEFAULTS, ...options };

	const created = makeRenderer(canvas);
	if (created === null) return null;
	const renderer: WebGLRenderer = created;

	const scene = new Scene();
	const camera = new PerspectiveCamera(60, 1, 0.1, settings.depth * 2);
	camera.position.z = 6;

	const positions = fieldPositions({ count: settings.count, spread: settings.spread, depth: settings.depth });
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(positions, 3));
	geometry.setAttribute("aSize", new BufferAttribute(fieldSizes(positions, settings.depth), 1));

	const material = new ShaderMaterial({
		vertexShader: STARFIELD_VERTEX,
		fragmentShader: STARFIELD_FRAGMENT,
		uniforms: {
			uColour: { value: new Color(accentColour()) },
			uOpacity: { value: settings.opacity },
			uDepth: { value: settings.depth },
			uScale: { value: 1 },
		},
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});

	const points = new Points(geometry, material);
	scene.add(points);

	const pointer = { x: 0, y: 0 };
	const lean = { x: 0, y: 0 };

	function resize(): void {
		const { clientWidth, clientHeight } = canvas;
		if (clientWidth === 0 || clientHeight === 0) return;

		const scale = renderScale(window.devicePixelRatio);
		renderer.setPixelRatio(scale);
		renderer.setSize(clientWidth, clientHeight, false);
		material.uniforms.uScale = { value: scale };
		camera.aspect = clientWidth / clientHeight;
		camera.updateProjectionMatrix();
	}

	function onPointerMove(event: PointerEvent): void {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
	}

	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	resize();

	let frame = 0;
	let last = performance.now();

	function render(now: number): void {
		// Clamped, or returning to a paused tab jumps the field forwards by however long it was away.
		const delta = Math.min(0.05, (now - last) / 1000);
		last = now;

		const target = parallaxTarget(pointer, { width: window.innerWidth, height: window.innerHeight }, settings.parallax);
		lean.x = damp(lean.x, target.x, 2, delta);
		lean.y = damp(lean.y, target.y, 2, delta);

		camera.position.x = lean.x;
		camera.position.y = lean.y;
		camera.lookAt(0, 0, -settings.depth / 2);

		points.rotation.z += delta * 0.012;
		points.position.z = (points.position.z + delta * 0.9) % settings.depth;

		renderer.render(scene, camera);
		frame = requestAnimationFrame(render);
	}

	function setRunning(running: boolean): void {
		if (running && frame === 0) {
			last = performance.now();
			frame = requestAnimationFrame(render);
			return;
		}

		if (!running && frame !== 0) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	}

	setRunning(true);

	return {
		setRunning,
		dispose: () => {
			setRunning(false);
			observer.disconnect();
			window.removeEventListener("pointermove", onPointerMove);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
		},
	};
}

/** A machine with WebGL disabled or blocked throws here, and an ornament is never worth a blank page. */
function makeRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
	try {
		return new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
	} catch {
		return null;
	}
}
