import {animation, style, animate, keyframes, query, group, trigger, transition, useAnimation, animateChild} from "@angular/animations";

const fadeIn = animation([style({opacity: "0", height: "0"}), animate("{{duration}} {{delay}}", style({opacity: "1", height: "*"}))], {
	params: {duration: "0.3s", delay: "0s"}
});
const fadeOut = animation([style({opacity: "1", height: "*"}), animate("{{duration}} {{delay}}", style({opacity: "0", height: "0"}))], {
	params: {duration: "0.3s", delay: "0s"}
});
export const fading = trigger("fading", [transition(":enter", useAnimation(fadeIn)), transition(":leave", useAnimation(fadeOut))]);

const show = animation(
	[
		group([
			style({opacity: "0"}),
			animate("{{duration}}", style({opacity: "1"})),
			query(".inner", [
				style({transform: "scale(0)"}),
				animate(
					"{{duration}}",
					keyframes([style({transform: "scale(1.1)", offset: "0.75"}), style({transform: "scale(1)", offset: "1"})])
				)
			])
		])
	],
	{params: {duration: "0.4s"}}
);
const hide = animation(
	[
		group([
			animate("{{duration}}", style({opacity: "0"})),
			query(".inner", [
				animate(
					"{{duration}}",
					keyframes([
						style({transform: "scale(1.1)", offset: "0.25"}),
						style({opacity: "0", transform: "scale(1.25)", offset: "1"})
					])
				)
			])
		])
	],
	{params: {duration: "0.4s"}}
);
export const showHide = trigger("showHide", [transition(":enter", useAnimation(show)), transition(":leave", useAnimation(hide))]);

export const routeAnimations = trigger("routeAnimations", [
	transition(
		"HomePage <=> WritingPage",
		animation([
			style({position: "relative"}),
			query(
				":enter, :leave",
				[
					style({
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%"
					})
				],
				{optional: true}
			),
			query(":enter", [style({opacity: "0", transform: "scale(0.5)"})], {optional: true}),
			query(":leave", animateChild(), {optional: true}),
			group([
				query(
					":leave",
					[animation([animate("{{duration}}", style({opacity: "0", transform: "scale(0.5)"}))], {params: {duration: "0.3s"}})],
					{
						optional: true
					}
				),
				query(
					":enter",
					[animation([animate("{{duration}}", style({opacity: "1", transform: "scale(1)"}))], {params: {duration: "0.3s"}})],
					{
						optional: true
					}
				)
			]),
			query(":enter", animateChild(), {optional: true})
		])
	)
]);
