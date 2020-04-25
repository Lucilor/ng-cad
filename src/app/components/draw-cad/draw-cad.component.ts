import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadDataService} from "@services/cad-data.service";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data";
import {environment} from "@src/environments/environment";
import {ActivatedRoute} from "@angular/router";

const title = "draw-cad";
@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit {
	cad: CadViewer;
	cads: {src: string; data: CadData}[] = [];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	constructor(private dataService: CadDataService, private route: ActivatedRoute) {}

	async ngAfterViewInit() {
		document.title = title;
		const data = (await this.dataService.getCadData())[0];
		this.cad = new CadViewer(data, {
			width: innerWidth,
			height: innerHeight,
			padding: [20, 20, 20, 100],
			showStats: !environment.production
		});
		this.cad.setControls({selectMode: "multiple"});
		this.cadContainer.nativeElement.append(this.cad.dom);
		this.dataService.loadCadStatus(this.cad, title);
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;

		window.addEventListener("keypress", (event) => {
			if (event.key === "Enter") {
				this.selectLines();
			}
		});
		window.addEventListener("beforeunload", () => {
			this.dataService.saveCadStatus(this.cad, title);
		});
	}

	selectLines() {
		const entities = this.cad.selectedEntities;
		const data = new CadData({entities, layers: this.cad.data.layers});
		data.name = "Cad-" + (this.cads.length + 1);
		const cad = new CadViewer(data, {padding: 10});
		this.cads.push({src: cad.exportImage().src, data});
		cad.destroy();
	}

	resetData() {}

	editCad(index: number) {
		this.dataService.saveCurrentCad(this.cads[index].data);
		window.open("edit-cad?encode=" + this.route.snapshot.queryParams.encode);
	}

	removeCad(index: number) {
		this.cads.splice(index, 1);
	}
}
