import {Point} from "@lucilor/utils";

export class BezierCurve {
	ctrlPoints: Point[];
	constructor(ctrlPoints: Point[]) {
		this.ctrlPoints = ctrlPoints;
	}

	deCasteljau(t: number, points = this.ctrlPoints) {
		const nextPoints = Array<Point>();
		for (let i = 0; i < points.length - 1; i++) {
			const p1 = points[i];
			const p2 = points[i + 1];
			const x = p1.x + (p2.x - p1.x) * t;
			const y = p1.y + (p2.y - p1.y) * t;
			nextPoints.push(new Point(x, y));
		}
		if (nextPoints.length === 1) {
			return nextPoints[0];
		}
		return this.deCasteljau(t, nextPoints);
	}

	getPoints(segments: number) {
		const points = Array<Point>();
		let t = 0;
		const step = 1 / segments;
		while (t <= 1) {
			points.push(this.deCasteljau(t));
			t += step;
        }
        return points;
	}
}
