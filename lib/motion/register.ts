'use client';

import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

/**
 * O registo de plugins é seguro em SSR — não toca em `window`. Apenas as
 * chamadas de animação são inseguras, e essas vivem todas dentro de useGSAP.
 * Este módulo é importado exatamente uma vez, pelo MotionProvider.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip, DrawSVGPlugin);

export { gsap, useGSAP, ScrollTrigger, SplitText, Flip, DrawSVGPlugin };
