/**
 * Shared script loader for multi-page HTML demo (works on file://).
 * Must run synchronously during HTML parse — do not defer or type="module".
 */
(function () {
	'use strict';

	var scripts = [
		'core/session.js',
		'core/navigate.js',
		'core/auth-guard.js',
		'locales/en.js',
		'locales/es.js',
		'locales/domain-en.js',
		'locales/domain-es.js',
		'locales/forms-en.js',
		'locales/forms-es.js',
		'locales/ui-en.js',
		'locales/ui-es.js',
		'core/i18n.js',
		'core/permissions.js',
		'core/modules.js',
		'core/links.js',
		'core/navigation.js',
		'core/audit.js',
		'repositories/baseRepository.js',
		'repositories/clientRepository.js',
		'repositories/caseRepository.js',
		'repositories/referralRepository.js',
		'repositories/intakeRepository.js',
		'repositories/riskAssessmentRepository.js',
		'repositories/carePlanRepository.js',
		'repositories/serviceEnrollmentRepository.js',
		'repositories/cboReferralRepository.js',
		'repositories/caseNoteRepository.js',
		'repositories/reassessmentRepository.js',
		'repositories/caseClosureRepository.js',
		'repositories/documentRepository.js',
		'repositories/userRepository.js',
		'repositories/initiativeRepository.js',
		'repositories/serviceUtilizationRepository.js',
		'repositories/customReportRepository.js',
		'repositories/reportSubscriptionRepository.js',
		'services/deduplicationService.js',
		'services/crossProgramFlagService.js',
		'services/caseCategoryService.js',
		'services/caseWorkflowService.js',
		'services/caseFormService.js',
		'services/followUpCadenceService.js',
		'services/reportEngine.js',
		'services/reportBuilderParams.js',
		'services/reportCatalog.js',
		'services/documentService.js',
		'services/clientService.js',
		'services/caseService.js',
		'services/dataService.js',
		'services/workflowService.js',
		'services/autofillService.js',
		'seed/seedData.js',
		'core/init.js',
		'vendor/exceljs.min.js',
		'ui/components.js',
		'services/notificationService.js',
		'ui/autofillFab.js',
		'ui/shell.js',
		'ui/stepper.js',
		'workflow/formHelpers.js',
		'core/boot.js'
	];

	var i;
	for (i = 0; i < scripts.length; i++) {
		document.write('<script src="js/' + scripts[i] + '"><\/script>');
	}
})();
