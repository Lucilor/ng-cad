import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadDataService} from "@services/cad-data.service";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data";

@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit {
	cad: CadViewer;
	cads: {src: string; data: CadData}[] = [];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	constructor(private dataService: CadDataService) {}

	async ngAfterViewInit() {
		const data = (await this.dataService.getCadData())[0];
		this.cad = new CadViewer(data, innerWidth, innerHeight, {
			padding: 100
		});
		this.cad.setControls({selectMode: "multiple"});
		this.cadContainer.nativeElement.append(this.cad.dom);
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
	}

	selectLines() {
		const entities = this.cad.selectedEntities;
		const data = new CadData({entities});
		const cad = new CadViewer(data);
		setTimeout(() => {
			this.cads.push({src: cad.exportImage().src, data});
		}, 1000);
		// cad.destroy();
	}

	resetData() {}

	editCad(index: number) {}

	removeCad(index: number) {}
}
