import {Vector2} from "three";
import {Line} from "@lucilor/utils";

export function getVectorFromArray(data: number[]) {
	if (!Array.isArray(data)) {
		return new Vector2();
	}
	data = data.filter((v) => !isNaN(v));
	return new Vector2(...data);
}

export function isLinesParallel(lines: Line[], accurary = 0.1) {
	const line0 = lines[0];
	for (let i = 1; i < lines.length; i++) {
		if (Math.abs(line0.slope - lines[i].slope) > accurary) {
			return false;
		}
	}
	return true;
}
