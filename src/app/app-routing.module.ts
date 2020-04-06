import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {DrawCadComponent} from "./draw-cad/draw-cad.component";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {PathResolveService} from "./path-resolve.service";
import {IndexComponent} from "./index/index.component";
import {EditCadComponent} from "./edit-cad/edit-cad.component";
import {AssembleCadComponent} from "./assemble-cad/assemble-cad.component";
import {PrintCadComponent} from "./print-cad/print-cad.component";
import {PlaygroundComponent} from "./playground/playground.component";

const routes: Routes = [
	{path: "", component: IndexComponent},
	{path: paths.playground, component: PlaygroundComponent},
	{path: paths["draw-cad"], component: DrawCadComponent},
	{path: paths["edit-cad"], component: EditCadComponent},
	{path: paths["assemble-cad"], component: AssembleCadComponent},
	{path: paths["print-cad"], component: PrintCadComponent},
	{path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
