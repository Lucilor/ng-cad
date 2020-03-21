import {Component, OnInit, ViewChild, ElementRef} from "@angular/core";
import {CadDataService} from "../cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {CadViewer} from "@lucilor/cad-viewer";

@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements OnInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef;
	constructor(private dataService: CadDataService, private route: ActivatedRoute) {}

	ngOnInit(): void {
		this.route.queryParams.subscribe(async params => {
			console.log(params);
			const data = await this.dataService.getRawData(params.encode, params.data);
			const cad = new CadViewer(data, innerWidth, innerHeight, {selectMode: "multiple"}).render(true);
			console.log(cad);
			cad.enableDragging()
				.enableKeyboard()
				.enableWheeling();
			this.cadContainer.nativeElement.append(cad.view);
		});
	}
}
