import {Vector2} from "three";

export class BezierCurve {
	ctrlPoints: Vector2[];
	constructor(ctrlPoints: Vector2[] = []) {
		this.ctrlPoints = ctrlPoints;
	}

	deCasteljau(t: number) {
		let currPoints = this.ctrlPoints;
		let nextPoints: Vector2[];
		const result: Vector2[][] = [currPoints];
		while (true) {
			nextPoints = [];
			for (let i = 0; i < currPoints.length - 1; i++) {
				const p1 = currPoints[i];
				const p2 = currPoints[i + 1];
				const x = p1.x + (p2.x - p1.x) * t;
				const y = p1.y + (p2.y - p1.y) * t;
				nextPoints.push(new Vector2(x, y));
			}
			if (nextPoints.length < 1) {
				break;
			}
			result.push(nextPoints);
			currPoints = nextPoints;
		}
		return result;
	}

	getPoint(t: number) {
		return this.deCasteljau(t).pop()[0];
	}

	getPoints(segments: number) {
		if (this.ctrlPoints.length < 2) {
			return [];
		}
		let t = 0;
		const step = 1 / segments;
		const points = [this.getPoint(t)];
		while (t < 1) {
			t = Math.min(1, t + step);
			points.push(this.getPoint(t));
		}
		return points;
	}
}
