import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data";
import {CadDataService} from "@services/cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {environment} from "@src/environments/environment";

const title = "编辑CAD";
@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	vCad: CadViewer;
	cadsData: CadData[];
	// get cad() {
	// 	return this.cads[this.status.cadIdx];
	// }
	constructor(private route: ActivatedRoute, private dataService: CadDataService) {}

	async ngAfterViewInit() {
		document.title = title;
		this.cadsData = await this.dataService.getCadData();
		this.vCad = new CadViewer(null, {width: innerWidth, height: innerHeight, showStats: !environment.production});
		this.cadContainer.nativeElement.appendChild(this.vCad.dom);
	}
}
