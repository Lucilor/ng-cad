import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import data from "../../cad.json";
import {CadViewer} from "../cad-viewer/cad-viewer";

@Component({
	selector: "app-playground",
	templateUrl: "./playground.component.html",
	styleUrls: ["./playground.component.scss"]
})
export class PlaygroundComponent implements AfterViewInit {
	@ViewChild("cadEl", {read: ElementRef}) cadEl: ElementRef<HTMLElement>;
	constructor() {}

	ngAfterViewInit() {
		const cad = new CadViewer(data as any, innerWidth, innerHeight);
		// cad.setControls({selectMode: "multiple"});
		this.cadEl.nativeElement.append(cad.dom);
		// tslint:disable-next-line: no-string-literal
		window["cad"] = cad;
	}
}
