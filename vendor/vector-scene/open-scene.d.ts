import type { ElementSlice, OpenSceneResult, SceneDeclaration, SceneElement } from "./types.js";
/**
 * VS3: opens a scene from declared layers, on a root or with none; or refuses the declaration with every
 * problem it has. Never throws while it judges the declaration; it throws only the error a platform method
 * threw while it made the layers, after removing every layer element it made. E, the kind of element the
 * root's document makes, is the type's alone: the scene treats every element as VS1's slice.
 */
export declare function openScene<E extends ElementSlice<E> = SceneElement>(declaration: SceneDeclaration<E>): OpenSceneResult<E>;
