const debounce = (func: Function, delay?: number) => {
	let timeout;
	return function () {
		const context = this, args = arguments;
		const later = () => {
			timeout = null;
			func.apply(context, args);
		};
		const callNow = !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, delay);
		if (callNow) func.apply(context, args);
	};
}

const preventDefault = (e: Event | React.MouseEvent) => {
	e.preventDefault();
}

const generateID = () => {
	const random = (min: number, max: number) => min + Math.random() * (max - min);

	const generate = (length: number): string =>
		length === 0 ? '' : String.fromCharCode(random(33, 127)) + generate(length - 1);

	const rnd = performance.now().toString()
	const length = 32 - rnd.length;
	return generate(length) + rnd;
}

export { generateID, debounce, preventDefault }