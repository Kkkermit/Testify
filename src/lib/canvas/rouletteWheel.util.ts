import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { type AnimationFrame, encodeAnimation } from "@lib/canvas/gif.util";
import { pocketColour, WHEEL_ORDER } from "@lib/casino/roulette.util";

/** A single-zero wheel drawn from above, with the ball's path worked out as plain maths so it can be tested. */

export const WHEEL_SIZE = 400;

const CENTRE = WHEEL_SIZE / 2;
const STEP = (Math.PI * 2) / WHEEL_ORDER.length;

export const WHEEL_RADII = {
	rim: 192,
	trackOuter: 178,
	trackInner: 152,
	numbersInner: 128,
	pocketsInner: 108,
	hub: 30,
} as const;

/** Where the ball rolls before it drops, and where it rests once it has. */
export const TRACK_RADIUS = (WHEEL_RADII.trackOuter + WHEEL_RADII.trackInner) / 2;
export const POCKET_RADIUS = (WHEEL_RADII.numbersInner + WHEEL_RADII.pocketsInner) / 2;

export const SPIN = {
	frames: 66,
	frameMs: 50,
	turns: 4,
	/** The share of the spin spent on the track before the ball falls, and then bouncing into the pocket. */
	dropAt: 0.55,
	dropFor: 0.35,
} as const;

const POCKET_FILL = { red: "#c0262d", black: "#17181c", green: "#16813d" } as const;

/** Zero sits at the top and the pockets run clockwise from it. */
export function pocketAngle(pocket: number): number {
	const index = WHEEL_ORDER.indexOf(pocket as (typeof WHEEL_ORDER)[number]);
	if (index === -1) throw new Error(`${pocket} is not a pocket on the wheel`);

	return -Math.PI / 2 + index * STEP;
}

function easeOut(progress: number): number {
	return 1 - (1 - progress) ** 3;
}

/** A settling bounce: past the pocket's rim, back out, then in to stay. */
function bounceIn(progress: number): number {
	if (progress >= 1) return 1;

	return 1 - Math.abs(Math.cos(progress * Math.PI * 2.5)) * (1 - progress) ** 2;
}

/** The ball's angle and distance from the centre at a point in the spin, from 0 to 1. */
export function ballAt(progress: number, pocket: number): { angle: number; radius: number } {
	const clamped = Math.min(1, Math.max(0, progress));
	const angle = pocketAngle(pocket) + SPIN.turns * Math.PI * 2 * (1 - easeOut(clamped));
	const drop = Math.min(1, Math.max(0, (clamped - SPIN.dropAt) / SPIN.dropFor));

	return { angle, radius: TRACK_RADIUS - (TRACK_RADIUS - POCKET_RADIUS) * bounceIn(drop) };
}

function drawStaticWheel(ctx: SKRSContext2D): void {
	const felt = ctx.createRadialGradient(CENTRE, CENTRE, 40, CENTRE, CENTRE, WHEEL_SIZE * 0.75);
	felt.addColorStop(0, "#155c42");
	felt.addColorStop(1, "#08251b");
	ctx.fillStyle = felt;
	ctx.fillRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

	const ring = (outer: number, inner: number, fill: SKRSContext2D["fillStyle"]): void => {
		ctx.beginPath();
		ctx.arc(CENTRE, CENTRE, outer, 0, Math.PI * 2);
		ctx.arc(CENTRE, CENTRE, inner, 0, Math.PI * 2, true);
		ctx.fillStyle = fill;
		ctx.fill();
	};

	const wood = ctx.createRadialGradient(CENTRE, CENTRE, WHEEL_RADII.trackOuter, CENTRE, CENTRE, WHEEL_RADII.rim);
	wood.addColorStop(0, "#5b3417");
	wood.addColorStop(1, "#8a5429");
	ring(WHEEL_RADII.rim, WHEEL_RADII.trackOuter, wood);

	const track = ctx.createRadialGradient(
		CENTRE,
		CENTRE,
		WHEEL_RADII.trackInner,
		CENTRE,
		CENTRE,
		WHEEL_RADII.trackOuter,
	);
	track.addColorStop(0, "#3a2413");
	track.addColorStop(1, "#6e4424");
	ring(WHEEL_RADII.trackOuter, WHEEL_RADII.trackInner, track);

	WHEEL_ORDER.forEach((pocket, index) => {
		const middle = -Math.PI / 2 + index * STEP;

		ctx.beginPath();
		ctx.arc(CENTRE, CENTRE, WHEEL_RADII.trackInner, middle - STEP / 2, middle + STEP / 2);
		ctx.arc(CENTRE, CENTRE, WHEEL_RADII.numbersInner, middle + STEP / 2, middle - STEP / 2, true);
		ctx.closePath();
		ctx.fillStyle = POCKET_FILL[pocketColour(pocket)];
		ctx.fill();

		ctx.save();
		ctx.translate(CENTRE, CENTRE);
		ctx.rotate(middle + Math.PI / 2);
		ctx.fillStyle = "#f4efe3";
		ctx.font = "bold 13px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(pocket), 0, -(WHEEL_RADII.trackInner + WHEEL_RADII.numbersInner) / 2);
		ctx.restore();
	});

	ring(WHEEL_RADII.numbersInner, WHEEL_RADII.pocketsInner, "#2b1a0e");

	ctx.strokeStyle = "#d8b25a";
	ctx.lineWidth = 1.5;
	for (let index = 0; index < WHEEL_ORDER.length; index += 1) {
		const edge = -Math.PI / 2 + (index + 0.5) * STEP;
		ctx.beginPath();
		ctx.moveTo(CENTRE + Math.cos(edge) * WHEEL_RADII.pocketsInner, CENTRE + Math.sin(edge) * WHEEL_RADII.pocketsInner);
		ctx.lineTo(CENTRE + Math.cos(edge) * WHEEL_RADII.trackInner, CENTRE + Math.sin(edge) * WHEEL_RADII.trackInner);
		ctx.stroke();
	}

	for (const radius of [WHEEL_RADII.trackInner, WHEEL_RADII.numbersInner, WHEEL_RADII.pocketsInner]) {
		ctx.beginPath();
		ctx.arc(CENTRE, CENTRE, radius, 0, Math.PI * 2);
		ctx.stroke();
	}

	const cone = ctx.createRadialGradient(CENTRE - 20, CENTRE - 20, 10, CENTRE, CENTRE, WHEEL_RADII.pocketsInner);
	cone.addColorStop(0, "#a8733c");
	cone.addColorStop(1, "#4a2b14");
	ring(WHEEL_RADII.pocketsInner, 0, cone);
}

function drawTurret(ctx: SKRSContext2D, turn: number): void {
	ctx.save();
	ctx.translate(CENTRE, CENTRE);
	ctx.rotate(turn);
	ctx.strokeStyle = "#e6c46e";
	ctx.fillStyle = "#e6c46e";
	ctx.lineWidth = 6;
	ctx.lineCap = "round";

	for (let arm = 0; arm < 4; arm += 1) {
		ctx.rotate(Math.PI / 2);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, -WHEEL_RADII.hub - 22);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0, -WHEEL_RADII.hub - 24, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.beginPath();
	ctx.arc(0, 0, 14, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function drawBall(ctx: SKRSContext2D, angle: number, radius: number): void {
	const x = CENTRE + Math.cos(angle) * radius;
	const y = CENTRE + Math.sin(angle) * radius;

	ctx.beginPath();
	ctx.arc(x + 1.5, y + 2, 6.5, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
	ctx.fill();

	const shine = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
	shine.addColorStop(0, "#ffffff");
	shine.addColorStop(1, "#b9bcc4");
	ctx.beginPath();
	ctx.arc(x, y, 6.5, 0, Math.PI * 2);
	ctx.fillStyle = shine;
	ctx.fill();
}

function drawResult(ctx: SKRSContext2D, pocket: number): void {
	const middle = pocketAngle(pocket);

	ctx.save();
	ctx.shadowColor = "#ffd76a";
	ctx.shadowBlur = 14;
	ctx.strokeStyle = "#ffd76a";
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.arc(CENTRE, CENTRE, WHEEL_RADII.trackInner, middle - STEP / 2, middle + STEP / 2);
	ctx.arc(CENTRE, CENTRE, WHEEL_RADII.pocketsInner, middle + STEP / 2, middle - STEP / 2, true);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();

	ctx.beginPath();
	ctx.arc(CENTRE, CENTRE, 34, 0, Math.PI * 2);
	ctx.fillStyle = POCKET_FILL[pocketColour(pocket)];
	ctx.fill();
	ctx.lineWidth = 3;
	ctx.strokeStyle = "#ffd76a";
	ctx.stroke();

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 30px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(String(pocket), CENTRE, CENTRE + 1);
}

let wheelLayer: Canvas | null = null;

/** The wheel never changes, so it is drawn once and stamped under every frame. */
function wheel(): Canvas {
	if (wheelLayer === null) {
		wheelLayer = createCanvas(WHEEL_SIZE, WHEEL_SIZE);
		drawStaticWheel(wheelLayer.getContext("2d"));
	}

	return wheelLayer;
}

function spinFrame(ctx: SKRSContext2D, progress: number, pocket: number): void {
	ctx.drawImage(wheel(), 0, 0);
	drawTurret(ctx, easeOut(progress) * Math.PI * 1.5);
	const ball = ballAt(progress, pocket);
	drawBall(ctx, ball.angle, ball.radius);
}

function settledFrame(ctx: SKRSContext2D, pocket: number): void {
	spinFrame(ctx, 1, pocket);
	drawResult(ctx, pocket);
}

export function rouletteStill(pocket: number): Buffer {
	const canvas = createCanvas(WHEEL_SIZE, WHEEL_SIZE);
	settledFrame(canvas.getContext("2d"), pocket);

	return canvas.toBuffer("image/png");
}

/** The spin as a GIF that plays once and ends on the settled wheel, and how long it runs. */
export function rouletteSpin(pocket: number): { gif: Buffer; durationMs: number } {
	const frames: AnimationFrame[] = Array.from({ length: SPIN.frames }, (_, index) => ({
		draw: (ctx) => spinFrame(ctx, index / (SPIN.frames - 1), pocket),
		delay: SPIN.frameMs,
	}));
	frames.push({ draw: (ctx) => settledFrame(ctx, pocket), delay: 5_000 });

	return { gif: encodeAnimation(WHEEL_SIZE, WHEEL_SIZE, frames), durationMs: SPIN.frames * SPIN.frameMs };
}
