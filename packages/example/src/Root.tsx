// @ts-expect-error no types
import styles from './styles.module.scss';

import {alias} from 'lib/alias';
import React, {useCallback, useMemo} from 'react';
import {CalculateMetadataFunction, getInputProps} from 'remotion';
import {z} from 'zod';
import {dynamicDurationSchema} from './DynamicDuration';
import './style.css';

// Dynamically import AI compositions if the registry file exists
let AIGeneratedCompositions: React.FC | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const {
		AIGeneratedCompositions: Generated,
	} = require('./ai-compositions-registry');
	AIGeneratedCompositions = Generated;
} catch {
	// File doesn't exist yet, compositions will be registered when created
}

if (alias !== 'alias') {
	throw new Error('should support TS aliases');
}

const INCLUDE_COMP_BREAKING_GET_COMPOSITIONS = false;

class Vector2 {
	readonly x: number;
	readonly y: number;

	constructor(x: number, y: number) {
		this.x = x;

		this.y = y;
	}

	toString(): string {
		return `Vector2 [X: ${this.x}, Y: ${this.y}]`;
	}
}

if (!styles.hithere) {
	throw new Error('should support SCSS modules');
}

// Use it to test that UI does not regress on weird CSS
// import './weird-css.css';

export const Index: React.FC = () => {
	const inputProps = getInputProps();

	const calculateMetadata: CalculateMetadataFunction<
		z.infer<typeof dynamicDurationSchema>
	> = useMemo(() => {
		return async ({props}) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const shouldLog = (..._data: unknown[]) => undefined;
			// To test logging
			// const shouldLog = console.log;
			const foo = function* () {
				yield 'a';
				yield 'b';
				yield 'c';
			};
			shouldLog('');
			shouldLog('');
			shouldLog('');
			shouldLog('');

			shouldLog('objects', {a: 'string'});
			shouldLog('boolean:', false);
			shouldLog('number:', 1);
			shouldLog('symbol', Symbol('hi'));
			shouldLog('Date:', new Date());
			shouldLog('bigint:', BigInt(123));
			shouldLog('function:', () => 'hi');
			shouldLog('array:', [1, 2, 3]);
			shouldLog('regex:', /abc/);
			shouldLog('');
			shouldLog('');
			shouldLog('');
			shouldLog('');
			shouldLog('Hello World ArrayBuffer', new ArrayBuffer(1));
			shouldLog('Hello World DataView', new DataView(new ArrayBuffer(1)));
			shouldLog('Hello World Error', new Error('hithere'));
			shouldLog('Hello World Generator', foo());
			shouldLog('Hello World Iterator', [1, 2, 3].values());
			const map = new Map();
			map.set('a', 1);
			shouldLog('Hello World Map', map);
			shouldLog('Hello World Node', document.createElement('div'));
			shouldLog('Hello World null', null);
			shouldLog(
				'Hello World Promise',
				new Promise<void>((resolve) => {
					resolve();
				}),
			);
			shouldLog('Hello World Proxy', new Proxy(document, {}));
			shouldLog('Hello World RegExp', /abc/);
			shouldLog('Hello World Set', {a: [1, 2, 3]});
			shouldLog('Hello World TypedArray', new Uint8Array([1, 2, 3]));
			const wm3 = new WeakMap();
			const o1 = {};
			wm3.set(o1, 'azerty');
			const ws = new WeakSet();
			const foo2 = {};

			ws.add(foo2);

			shouldLog('Hello World WeakMap', wm3);
			shouldLog('Hello World WeakSet', ws);

			await new Promise((r) => {
				setTimeout(r, 1000);
			});

			return {
				durationInFrames: props.duration,
				fps: 30,
			};
		};
	}, []);

	const failingCalculateMetadata: CalculateMetadataFunction<
		z.infer<typeof dynamicDurationSchema>
	> = useCallback(async () => {
		await new Promise((r) => {
			setTimeout(r, 1000);
		});
		// Enable this for testing, however it will break getCompositions():
		// throw new Error('Failed to calculate metadata');
		return {
			props: {duration: 100},
		};
	}, []);

	const syncCalculateMetadata: CalculateMetadataFunction<
		z.infer<typeof dynamicDurationSchema>
	> = useCallback(() => {
		// Enable this for testing, however it will break getCompositions():
		// throw new Error('Failed to calculate metadata');
		return {
			props: {duration: 100},
		};
	}, []);

	return <>{AIGeneratedCompositions && <AIGeneratedCompositions />}</>;
};
