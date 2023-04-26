import { readFile } from 'node:fs/promises';
import { resample, resampleWASM, Interpolation } from 'keyframe-resample';
import { performance } from 'node:perf_hooks';

/******************************************************************************
 * Setup
 */

const INPUT_PATH = new URL('../data/arm_keyframes.json', import.meta.url);

const BYTES_PER_MB = 1024 * 1024;
const MS_PER_S = 1000;

interface Sampler {
	input: number[];
	output: number[];
	interpolation: 'CUBICSPLINE' | 'LINEAR' | 'STEP';
	path: string;
}

/******************************************************************************
 * Benchmark
 */

async function run(label: string, resample: Function) {
	const samplers = JSON.parse(await readFile(INPUT_PATH, { encoding: 'utf-8' }));

	let srcCount = 0;
	let dstCount = 0;
	let byteLength = 0;

	for (const sampler of samplers) {
		sampler.input = new Float32Array(sampler.input);
		sampler.output = new Float32Array(sampler.output);
		byteLength += sampler.input.byteLength + sampler.output.byteLength;
	}

	let t0 = performance.now();
	for (const sampler of samplers) {
		srcCount += sampler.input.length;
		dstCount += resample(sampler.input, sampler.output, getInterpolation(sampler));
	}
	let t = performance.now() - t0;

	console.log(label);
	console.log(dim(`  ${formatLong(Math.round(t))}ms`));
	console.log(dim(`  ${Math.round(byteLength / BYTES_PER_MB / (t / MS_PER_S))} MB/s`));
	console.log(dim(`  ${formatLong(srcCount)} → ${formatLong(dstCount)} keyframes`));
	console.log('\n');
}

await run('\nJavaScript', resample);
await run('WASM', resampleWASM);

/******************************************************************************
 * Utilities
 */

function getInterpolation(sampler: Sampler): any {
	if (sampler.interpolation === 'LINEAR') {
		return sampler.path === 'rotation' ? Interpolation.SLERP : Interpolation.LERP;
	} else if (sampler.interpolation === 'STEP') {
		return Interpolation.STEP;
	} else {
		throw new Error(`Unexpected interpolation, ${sampler.interpolation}`);
	}
}

function formatLong(x: number): string {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function dim(str: string) {
	return `\x1b[2m${str}\x1b[0m`;
}
