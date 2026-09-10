/* global RM */
(function () {
	'use strict';

	var locale = window.RM._LOCALES.es;
	Object.assign(locale, {
		category: {
			'cat-senior-services': 'Servicios sociales para personas mayores',
			'cat-parenting-support': 'Programas de apoyo a la crianza',
			'cat-mental-health': 'Servicios de salud mental',
			'cat-community-services': 'Servicios sociales comunitarios'
		},
		subcategory: {
			'sub-seniors-at-risk': 'Personas mayores en riesgo',
			'sub-in-home-support': 'Apoyo en el hogar',
			'sub-nutrition-programs': 'Programas de nutrición',
			'sub-youth-empowerment': 'Grupos de empoderamiento juvenil',
			'sub-family-resource': 'Centro de recursos familiares',
			'sub-parent-education': 'Educación para padres',
			'sub-crisis-response': 'Respuesta a crisis',
			'sub-outpatient-counseling': 'Consejería ambulatoria',
			'sub-peer-support': 'Apoyo entre pares',
			'sub-housing-assistance': 'Asistencia de vivienda',
			'sub-employment-support': 'Apoyo de empleo',
			'sub-general-intake': 'Ingreso general'
		},
		case: {
			caseCategory: 'Categoría del caso',
			subcategory: 'Subcategoría',
			allCategories: 'Todas las categorías',
			allSubcategories: 'Todas las subcategorías',
			continueReferral: 'Continuar a referencia e ingreso',
			selectSubcategoryPreview: 'Seleccione una subcategoría para previsualizar el flujo de trabajo.',
			categoryBanner: 'Categoría del caso:',
			subcategoryBanner: 'Subcategoría:'
		},
		workflow: {
			tabs: {
				documents: 'Documentos',
				activity: 'Actividad'
			},
			default: {
				name: 'Flujo de gestión de casos',
				description: 'Proceso estándar de gestión de casos en ocho etapas.',
				exampleProgram: 'Gestión de casos genérica',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia y consentimiento en archivo' },
					assessment: { label: 'Evaluación integral', deliverable: 'Resumen de evaluación holística' },
					risk: { label: 'Identificación y priorización de riesgo', deliverable: 'Perfil de riesgo priorizado' },
					careplan: { label: 'Desarrollo del plan de atención/servicios', deliverable: 'Plan de atención individualizado' },
					services: { label: 'Coordinación de servicios', deliverable: 'Inscripciones en servicios y referencias CBO' },
					followup: { label: 'Monitoreo y seguimiento continuo', deliverable: 'Notas de contacto y cadencia de seguimiento' },
					reassessment: { label: 'Reevaluación', deliverable: 'Calificaciones de riesgo y ajustes del plan actualizados' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Resumen de cierre y resultados' }
				}
			},
			'sub-seniors-at-risk': {
				name: 'Gestión de casos para personas mayores en riesgo',
				description: 'Identificar riesgos de seguridad y bienestar en adultos mayores y coordinar servicios de protección.',
				exampleProgram: 'Referencia hospitalaria o comunitaria por caídas, aislamiento o autoabandono',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia recibido y asignado' },
					assessment: { label: 'Evaluación integral', deliverable: 'Resumen de evaluación holística' },
					risk: { label: 'Identificación y priorización de riesgo', deliverable: 'Perfil de riesgo priorizado' },
					careplan: { label: 'Desarrollo del plan de atención/servicios', deliverable: 'Plan de atención individualizado' },
					services: { label: 'Coordinación de servicios', deliverable: 'Inscripciones en servicios y referencias CBO' },
					followup: { label: 'Monitoreo y seguimiento continuo', deliverable: 'Notas de contacto y cadencia de seguimiento' },
					reassessment: { label: 'Reevaluación', deliverable: 'Calificaciones de riesgo y ajustes del plan actualizados' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Resumen de cierre y resultados' }
				},
				focusAreas: {
					0: 'Prevención de caídas',
					1: 'Seguridad de medicamentos',
					2: 'Aislamiento social',
					3: 'Detección de abuso o negligencia'
				}
			},
			'sub-in-home-support': {
				name: 'Flujo de apoyo en el hogar',
				description: 'Apoyar a adultos mayores para permanecer de forma segura en casa mediante servicios coordinados.',
				exampleProgram: 'Referencia médica por apoyo en AVD y seguridad en el hogar',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Referencia y elegibilidad para apoyo en el hogar' },
					assessment: { label: 'Evaluación de necesidades en el hogar', deliverable: 'Resumen funcional y del entorno del hogar' },
					risk: { label: 'Revisión de seguridad e independencia', deliverable: 'Necesidades de apoyo priorizadas' },
					careplan: { label: 'Plan de atención en el hogar', deliverable: 'Plan de cuidado personal y equipamiento' },
					services: { label: 'Coordinación de proveedores', deliverable: 'Referencias de cuidado en el hogar y equipamiento' },
					followup: { label: 'Monitoreo de visitas al hogar', deliverable: 'Notas de visita y coordinación con cuidadores' },
					reassessment: { label: 'Reevaluación funcional', deliverable: 'Metas de independencia actualizadas' },
					closure: { label: 'Transición / cierre', deliverable: 'Transición a otro nivel de atención o graduación' }
				},
				focusAreas: {
					0: 'Actividades de la vida diaria',
					1: 'Apoyo al cuidador',
					2: 'Modificaciones del hogar',
					3: 'Necesidades de equipamiento'
				}
			},
			'sub-nutrition-programs': {
				name: 'Flujo de programas de nutrición',
				description: 'Conectar a personas mayores con programas de comidas y monitorear su bienestar nutricional.',
				exampleProgram: 'Referencia comunitaria por inseguridad alimentaria o riesgo de malnutrición',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia al programa de nutrición' },
					assessment: { label: 'Detección nutricional', deliverable: 'Evaluación dietética y de acceso a alimentos' },
					risk: { label: 'Priorización de riesgo nutricional', deliverable: 'Nivel de prioridad para servicios de comidas' },
					careplan: { label: 'Plan de apoyo nutricional', deliverable: 'Metas de servicio de comidas y dieta' },
					services: { label: 'Inscripción en programa de comidas', deliverable: 'Inscripción en Comidas a Domicilio o comedor comunitario' },
					followup: { label: 'Monitoreo nutricional', deliverable: 'Seguimiento de peso, apetito y entrega de comidas' },
					reassessment: { label: 'Revisión nutricional trimestral', deliverable: 'Plan dietético actualizado' },
					closure: { label: 'Graduación / cierre del programa', deliverable: 'Transición a autosuficiencia u otro programa' }
				},
				focusAreas: {
					0: 'Acceso a alimentos',
					1: 'Entrega de comidas',
					2: 'Restricciones dietéticas',
					3: 'Participación en comidas sociales'
				}
			},
			'sub-youth-empowerment': {
				name: 'Flujo de apoyo a la asistencia escolar',
				description: 'Apoyar a familias cuando la asistencia escolar o el compromiso juvenil está en riesgo.',
				exampleProgram: 'Referencia escolar por ausentismo crónico',
				stages: {
					intake: { label: 'Referencia e ingreso escolar', deliverable: 'Registro de referencia escolar asignado' },
					assessment: { label: 'Evaluación familiar y de asistencia', deliverable: 'Barreras de asistencia identificadas' },
					risk: { label: 'Priorización de riesgo de asistencia', deliverable: 'Barreras prioritarias clasificadas' },
					careplan: { label: 'Plan de apoyo a la asistencia', deliverable: 'Metas de asistencia y compromiso familia-escuela' },
					services: { label: 'Referencias de recursos', deliverable: 'Enlaces de transporte, cuidado infantil y consejería escolar' },
					followup: { label: 'Revisión mensual de asistencia', deliverable: 'Seguimiento de asistencia y notas de coaching' },
					reassessment: { label: 'Revisión de progreso', deliverable: 'Tendencia de asistencia y ajustes del plan' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Familia autosuficiente en la gestión de la asistencia' }
				},
				focusAreas: {
					0: 'Asistencia escolar',
					1: 'Barreras de transporte',
					2: 'Desafíos de cuidado infantil',
					3: 'Comunicación familia-escuela'
				}
			},
			'sub-family-resource': {
				name: 'Flujo del centro de recursos familiares',
				description: 'Conectar familias con recursos comunitarios mediante un modelo de centro de recursos familiares.',
				exampleProgram: 'Autorreferencia o referencia de agencia a un centro de recursos familiares',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia recibido y asignado' },
					assessment: { label: 'Ingreso e inscripción', deliverable: 'Perfil familiar y elegibilidad verificados' },
					risk: { label: 'Evaluación de necesidades', deliverable: 'Resumen de evaluación de necesidades' },
					careplan: { label: 'Definición de metas y planificación de servicios', deliverable: 'Plan de apoyo familiar individualizado' },
					services: { label: 'Coordinación y referencias de servicios', deliverable: 'Seguimiento de referencias y servicios activados' },
					followup: { label: 'Apoyo y monitoreo continuo', deliverable: 'Notas del caso y elementos de acción actualizados' },
					reassessment: { label: 'Revisión de progreso', deliverable: 'Plan de apoyo e informe de progreso actualizados' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Resumen de resultados y documentación de salida' }
				},
				focusAreas: {
					0: 'Apoyo a la crianza',
					1: 'Desarrollo infantil',
					2: 'Recursos comunitarios',
					3: 'Relaciones familiares'
				}
			},
			'sub-parent-education': {
				name: 'Flujo del programa de habilidades parentales',
				description: 'Fortalecer la confianza parental mediante coaching, grupos y referencias a consejería.',
				exampleProgram: 'Referencia por desafíos de conducta infantil',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Referencia al programa de crianza recibida' },
					assessment: { label: 'Evaluación parental y familiar', deliverable: 'Factores de conducta y estrés identificados' },
					risk: { label: 'Revisión de estrés y prioridades familiares', deliverable: 'Áreas de alto estrés priorizadas' },
					careplan: { label: 'Plan de coaching parental', deliverable: 'Metas de interacción y reducción de estrés' },
					services: { label: 'Referencias de coaching y grupos', deliverable: 'Coaching parental, grupos de apoyo, consejería' },
					followup: { label: 'Seguimiento de implementación de habilidades', deliverable: 'Documentación de práctica de habilidades parentales' },
					reassessment: { label: 'Revisión de progreso', deliverable: 'Revisión de incidentes de conducta y confianza' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Padre/madre gestiona desafíos de forma independiente' }
				},
				focusAreas: {
					0: 'Manejo de la conducta',
					1: 'Interacciones padre-hijo',
					2: 'Estrés parental',
					3: 'Grupos de apoyo'
				}
			},
			'sub-crisis-response': {
				name: 'Flujo de respuesta a crisis',
				description: 'Respuesta rápida a crisis de salud mental con planificación de seguridad y estabilización.',
				exampleProgram: 'Referencia de línea de crisis o urgencias que requiere triage inmediato',
				stages: {
					intake: { label: 'Referencia y triage de crisis', deliverable: 'Referencia de crisis registrada y asignada' },
					assessment: { label: 'Evaluación de seguridad y crisis', deliverable: 'Evaluación inmediata de seguridad y riesgo' },
					risk: { label: 'Priorización de agudeza', deliverable: 'Nivel de agudeza de crisis documentado' },
					careplan: { label: 'Plan de estabilización', deliverable: 'Plan de seguridad e intervenciones inmediatas' },
					services: { label: 'Vinculación de recursos de crisis', deliverable: 'Cama de crisis, equipo móvil o enlace ambulatorio' },
					followup: { label: 'Monitoreo de crisis', deliverable: 'Contactos de seguimiento en 24–72 horas' },
					reassessment: { label: 'Revisión de estabilización', deliverable: 'Preparación para atención de menor intensidad' },
					closure: { label: 'Alta / cierre de crisis', deliverable: 'Traspaso cálido a servicios continuos' }
				},
				focusAreas: {
					0: 'Riesgo de suicidio/homicidio',
					1: 'Planificación de seguridad',
					2: 'Estabilización de crisis',
					3: 'Traspaso cálido'
				}
			},
			'sub-outpatient-counseling': {
				name: 'Flujo de consejería ambulatoria',
				description: 'Gestión de casos de salud mental ambulatoria desde el ingreso hasta la planificación del tratamiento.',
				exampleProgram: 'Referencia de salud o autorreferencia para consejería ambulatoria',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Referencia de consejería y consentimiento' },
					assessment: { label: 'Evaluación clínica de ingreso', deliverable: 'Resumen de evaluación biopsicosocial' },
					risk: { label: 'Detección clínica de riesgo', deliverable: 'Factores de riesgo y agudeza documentados' },
					careplan: { label: 'Desarrollo del plan de tratamiento', deliverable: 'Metas, modalidades y frecuencia' },
					services: { label: 'Coordinación de terapia', deliverable: 'Programación de sesiones y referencias auxiliares' },
					followup: { label: 'Monitoreo del tratamiento', deliverable: 'Notas de sesión y seguimiento de participación' },
					reassessment: { label: 'Revisión del plan de tratamiento', deliverable: 'Progreso de metas y actualizaciones del plan' },
					closure: { label: 'Planificación del alta', deliverable: 'Resumen de reducción de intensidad o finalización exitosa' }
				},
				focusAreas: {
					0: 'Evaluación clínica',
					1: 'Planificación del tratamiento',
					2: 'Participación en terapia',
					3: 'Coordinación de medicamentos'
				}
			},
			'sub-peer-support': {
				name: 'Flujo de apoyo entre pares',
				description: 'Apoyo de recuperación liderado por pares con definición de metas y conexión comunitaria.',
				exampleProgram: 'Referencia a programa certificado de especialista en apoyo entre pares',
				stages: {
					intake: { label: 'Referencia e inscripción', deliverable: 'Registro de inscripción en apoyo entre pares' },
					assessment: { label: 'Evaluación de necesidades de recuperación', deliverable: 'Metas y fortalezas de recuperación identificadas' },
					risk: { label: 'Priorización de necesidades de apoyo', deliverable: 'Dominios de recuperación prioritarios clasificados' },
					careplan: { label: 'Plan de recuperación entre pares', deliverable: 'Metas definidas por pares y pasos de acción' },
					services: { label: 'Vinculación de servicios entre pares', deliverable: 'Grupos, coaching y conexiones comunitarias' },
					followup: { label: 'Check-ins entre pares', deliverable: 'Progreso de recuperación y documentación de barreras' },
					reassessment: { label: 'Revisión de progreso de recuperación', deliverable: 'Revisión del logro de metas' },
					closure: { label: 'Graduación / cierre', deliverable: 'Transición a apoyos de recuperación autodirigidos' }
				},
				focusAreas: {
					0: 'Metas de recuperación',
					1: 'Mentoría entre pares',
					2: 'Integración comunitaria',
					3: 'Prevención de recaídas'
				}
			},
			'sub-housing-assistance': {
				name: 'Flujo del programa de estabilidad familiar',
				description: 'Estabilizar vivienda y necesidades básicas para familias en dificultades financieras.',
				exampleProgram: 'Solicitud familiar de asistencia por dificultades financieras',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Referencia de estabilidad de vivienda recibida' },
					assessment: { label: 'Evaluación de estabilidad', deliverable: 'Hallazgos de empleo, vivienda y cuidado infantil' },
					risk: { label: 'Revisión de riesgo de inestabilidad', deliverable: 'Riesgo de desalojo y crisis priorizado' },
					careplan: { label: 'Plan de apoyo a la estabilidad', deliverable: 'Metas de empleo, vivienda y cuidado infantil' },
					services: { label: 'Referencias de vivienda y beneficios', deliverable: 'Solicitudes de fuerza laboral, vivienda y subsidios' },
					followup: { label: 'Reuniones mensuales de progreso', deliverable: 'Notas de progreso y seguimiento de barreras' },
					reassessment: { label: 'Revisión de progreso de estabilidad', deliverable: 'Revisión de resultados de vivienda e ingresos' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Vivienda estable y apoyos a largo plazo conectados' }
				},
				focusAreas: {
					0: 'Estabilidad de vivienda',
					1: 'Empleo',
					2: 'Cuidado infantil asequible',
					3: 'Alfabetización financiera'
				}
			},
			'sub-employment-support': {
				name: 'Flujo de apoyo de empleo',
				description: 'Ayudar a clientes a conseguir y mantener empleo mediante servicios de desarrollo laboral.',
				exampleProgram: 'Referencia de agencia comunitaria para búsqueda y retención de empleo',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia al programa de empleo' },
					assessment: { label: 'Evaluación de fuerza laboral', deliverable: 'Resumen de habilidades, barreras y preparación laboral' },
					risk: { label: 'Revisión de barreras de empleo', deliverable: 'Barreras prioritarias para el empleo' },
					careplan: { label: 'Plan de acción de empleo', deliverable: 'Metas de búsqueda de empleo y pasos de capacitación' },
					services: { label: 'Referencias de fuerza laboral', deliverable: 'Capacitación, colocación laboral y servicios de apoyo' },
					followup: { label: 'Monitoreo de búsqueda de empleo', deliverable: 'Seguimiento de solicitudes y entrevistas' },
					reassessment: { label: 'Revisión de progreso de empleo', deliverable: 'Revisión de retención laboral e ingresos' },
					closure: { label: 'Cierre de empleo', deliverable: 'Empleo estable y recursos de seguimiento' }
				},
				focusAreas: {
					0: 'Preparación laboral',
					1: 'Capacitación en habilidades',
					2: 'Colocación laboral',
					3: 'Apoyo a la retención'
				}
			},
			'sub-general-intake': {
				name: 'Flujo de ingreso comunitario',
				description: 'Ingreso general de servicios sociales comunitarios que conecta clientes con programas adecuados.',
				exampleProgram: 'Referencia sin cita o de agencia socia para necesidades de servicio no determinadas',
				stages: {
					intake: { label: 'Referencia e ingreso', deliverable: 'Registro de referencia recibido y asignado' },
					assessment: { label: 'Ingreso e inscripción', deliverable: 'Perfil familiar y elegibilidad verificados' },
					risk: { label: 'Evaluación de necesidades', deliverable: 'Resumen de evaluación de necesidades' },
					careplan: { label: 'Definición de metas y planificación de servicios', deliverable: 'Plan de apoyo familiar individualizado' },
					services: { label: 'Coordinación y referencias de servicios', deliverable: 'Seguimiento de referencias y servicios activados' },
					followup: { label: 'Apoyo y monitoreo continuo', deliverable: 'Notas del caso y elementos de acción actualizados' },
					reassessment: { label: 'Revisión de progreso', deliverable: 'Plan de apoyo e informe de progreso actualizados' },
					closure: { label: 'Resolución / cierre del caso', deliverable: 'Resumen de resultados y documentación de salida' }
				},
				focusAreas: {
					0: 'Detección de elegibilidad',
					1: 'Enrutamiento de programas',
					2: 'Necesidades básicas',
					3: 'Referencias cálidas'
				}
			}
		}
	});

	Object.assign(locale.fallback, {
		'Senior Social Services': 'Servicios sociales para personas mayores',
		'Parenting Support Programs': 'Programas de apoyo a la crianza',
		'Mental Health Services': 'Servicios de salud mental',
		'Community Social Services': 'Servicios sociales comunitarios',
		'Seniors at Risk': 'Personas mayores en riesgo',
		'In-Home Support': 'Apoyo en el hogar',
		'Nutrition Programs': 'Programas de nutrición',
		'Youth Empowerment Groups': 'Grupos de empoderamiento juvenil',
		'Family Resource Center': 'Centro de recursos familiares',
		'Parent Education': 'Educación para padres',
		'Crisis Response': 'Respuesta a crisis',
		'Outpatient Counseling': 'Consejería ambulatoria',
		'Peer Support': 'Apoyo entre pares',
		'Housing Assistance': 'Asistencia de vivienda',
		'Employment Support': 'Apoyo de empleo',
		'General Intake': 'Ingreso general',
		'Case category': 'Categoría del caso',
		'Subcategory': 'Subcategoría',
		'All categories': 'Todas las categorías',
		'All subcategories': 'Todas las subcategorías',
		'Category': 'Categoría'
	});
})();
