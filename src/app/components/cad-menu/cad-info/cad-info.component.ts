import {Component, OnInit, Input} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadMenu} from "../cad-menu.common";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent implements OnInit {
	@Input() menu: CadMenu;
	get data() {
		return this.menu.getData();
	}
	cadLength = 0;
	constructor() {}

	ngOnInit() {}

	submit() {}

	replaceData() {}

	updateCadLength() {
		this.cadLength = 0;
		const entities = this.data.entities;
		entities.line.forEach((e) => {
			const {start, end} = e;
			const l = Math.sqrt((start[0] - end[0]) ** 2 + (start[1] - end[1]) ** 2);
			this.cadLength += l;
		});
		entities.arc.forEach((e) => {
			const {radius, start_angle, end_angle} = e;
			const l = ((Math.abs(start_angle - end_angle) % 360) * Math.PI * radius) / 180;
			this.cadLength += l;
		});
		this.cadLength = Number(this.cadLength.toFixed(2));
	}
}
