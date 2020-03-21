import {Component, OnInit} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
	selector: "app-index",
	templateUrl: "./index.component.html",
	styleUrls: ["./index.component.scss"]
})
export class IndexComponent implements OnInit {
	constructor(private router: Router) {}

	ngOnInit(): void {
		// this.route.params.subscribe(params => {
		// 	console.log(params);
		// });
		const params: any = {};
		location.search
			.slice(1)
			.split("&")
			.forEach(s => {
				const ss = s.split("=");
				if (ss[0]) {
					params[ss[0]] = ss[1];
				}
			});
		console.log(params);
		this.router.navigate([params.to], {queryParams: {...params}});
	}
}
