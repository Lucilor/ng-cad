import {Component, OnInit, Input} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadMenu} from "../cad-menu.common";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() cadIdx: number;
	@Input() menu: CadMenu;
	cadLength = 0;
	constructor() {}

	ngOnInit() {}

	submit() {}

	replaceData() {}
}
