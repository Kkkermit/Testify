/** Two short shaders, because `PointsMaterial` draws squares unless it is handed a sprite texture to fetch. */

export const STARFIELD_VERTEX = /* glsl */ `
	attribute float aSize;
	uniform float uScale;
	uniform float uDepth;
	varying float vFade;

	void main() {
		vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
		gl_Position = projectionMatrix * viewPosition;

		float distance = max(0.001, -viewPosition.z);
		// Capped: without it a point that drifts close to the camera fills a quarter of the screen.
		gl_PointSize = min(aSize * uScale * (110.0 / distance), 11.0);

		// Points dissolve into the background rather than ending at a visible plane.
		vFade = clamp(1.0 - distance / uDepth, 0.0, 1.0);
	}
`;

export const STARFIELD_FRAGMENT = /* glsl */ `
	precision mediump float;

	uniform vec3 uColour;
	uniform float uOpacity;
	varying float vFade;

	void main() {
		float radius = length(gl_PointCoord - vec2(0.5));
		if (radius > 0.5) discard;

		float edge = smoothstep(0.5, 0.1, radius);
		gl_FragColor = vec4(uColour, edge * vFade * uOpacity);
	}
`;
