import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {take} from "rxjs/operators";

@Component({
	selector: "app-page-not-found",
	templateUrl: "./page-not-found.component.html",
	styleUrls: ["./page-not-found.component.scss"]
})
export class PageNotFoundComponent implements OnInit {
	constructor(private route: ActivatedRoute) {}
	path: string;

	ngOnInit() {
		this.route.data.pipe(take(1)).subscribe((data: {path: string}) => {
			this.path = data.path;
		});
	}
}
