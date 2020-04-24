import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadDataService} from "@services/cad-data.service";
import {CadViewer} from "@app/cad-viewer/cad-viewer";

@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit {
	cad: CadViewer;
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	constructor(private dataService: CadDataService) {}

	async ngAfterViewInit() {
		const data = (await this.dataService.getCadData())[0];
		this.cad = new CadViewer(data, innerWidth, innerHeight);
		this.cad.setControls({selectMode: "multiple"});
		this.cadContainer.nativeElement.append(this.cad.dom);
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
	}

	selectLines() {}

	resetData() {}
}
