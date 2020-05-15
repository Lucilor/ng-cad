import {Vector2, Matrix3} from "three";

export class CadTransformation {
	translate: Vector2;
	flip: {vertical: boolean; horizontal: boolean; anchor: Vector2};
	rotate: {angle: number; anchor: Vector2};
	get matrix() {
		const matrix = new Matrix3();
		const {translate, flip, rotate} = this;
		const {x: tx, y: ty} = translate;
		// TODO 翻转锚点未实现
		const sx = flip.horizontal ? -1 : 1;
		const sy = flip.vertical ? -1 : 1;
		const {angle, anchor} = rotate;
		matrix.setUvTransform(tx, ty, sx, sy, angle, anchor.x, anchor.y);
		return matrix;
	}

	constructor(
		params: {
			translate?: Vector2;
			flip?: {vertical?: boolean; horizontal?: boolean; anchor?: Vector2};
			rotate?: {angle?: number; anchor?: Vector2};
		} = {}
	) {
		this.translate = params.translate || new Vector2();
		{
			const {vertical = false, horizontal = false, anchor = new Vector2()} = params.flip || {};
			this.flip = {vertical, horizontal, anchor};
		}
		{
			const {angle = 0, anchor = new Vector2()} = params.rotate || {};
			this.rotate = {angle, anchor};
		}
	}
}
