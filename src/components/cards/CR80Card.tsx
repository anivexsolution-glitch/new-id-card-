import React from 'react';
import { CardCustomization, PortraitTemplateId, LandscapeTemplateId, SchoolSettings, Student, TemplateId } from '../../types';
import { getPairedTemplateId } from '../../constants/initialData';
import { CardBackSide } from './CardShared';
import { RenderPortraitTemplate } from './PortraitTemplates';
import { RenderLandscapeTemplate } from './LandscapeTemplates';

interface CR80CardProps {
  student: Student;
  schoolSettings: SchoolSettings;
  customization?: Partial<CardCustomization>;
  side?: 'front' | 'back';
  className?: string;
  id?: string;
}

export const CR80Card: React.FC<CR80CardProps> = ({
  student,
  schoolSettings,
  customization,
  side = 'front',
  className = '',
  id,
}) => {
  // Merge saved school defaultCustomization with per-render customization overrides
  const mergedCustomization: Partial<CardCustomization> = {
    ...(schoolSettings.defaultCustomization || {}),
    ...(customization || {}),
    customLabels: {
      ...(schoolSettings.defaultCustomization?.customLabels || {}),
      ...(customization?.customLabels || {}),
    },
  };

  const orientation = mergedCustomization?.templateId
    ? (mergedCustomization.templateId.startsWith('portrait_') ? 'portrait' : 'landscape')
    : mergedCustomization?.orientation || schoolSettings.defaultOrientation || 'portrait';
  const currentSide = mergedCustomization?.side || side;

  // Resolve template ID matching orientation — preserve theme across portrait <-> landscape via paired map
  let templateId: TemplateId;
  if (mergedCustomization?.templateId) {
    templateId = getPairedTemplateId(mergedCustomization.templateId, orientation);
  } else {
    templateId = getPairedTemplateId(
      schoolSettings.defaultTemplateId || 'portrait_red_magenta_curved',
      orientation
    );
  }

  const visibleFields = {
    ...schoolSettings.visibleFields,
    ...(mergedCustomization?.fieldVisibility || {}),
  };

  const showLogo = (mergedCustomization?.showLogo ?? true) && visibleFields.logo !== false;
  const showSignature = (mergedCustomization?.showSignature ?? true) && visibleFields.principalSignature !== false;
  const showBarcode = mergedCustomization?.showBarcode ?? visibleFields.barcode ?? true;

  const themedSettings =
    mergedCustomization?.primaryColorOverride || mergedCustomization?.accentColorOverride
      ? {
          ...schoolSettings,
          customBrandColors: {
            enabled: true,
            primary:
              mergedCustomization.primaryColorOverride ||
              schoolSettings.customBrandColors?.primary ||
              '#183d35',
            accent:
              mergedCustomization.accentColorOverride ||
              schoolSettings.customBrandColors?.accent ||
              '#b49767',
            secondary: schoolSettings.customBrandColors?.secondary || '#65736d',
          },
        }
      : schoolSettings;

  // Render Reverse Side (Back)
  if (currentSide === 'back') {
    return (
      <CardBackSide
        student={student}
        schoolSettings={themedSettings}
        orientation={orientation}
        templateId={templateId}
        visibleFields={visibleFields}
        showLogo={showLogo}
        showSignature={showSignature}
        showBarcode={showBarcode}
        customization={mergedCustomization}
        id={id}
        className={className}
      />
    );
  }

  // Render Front Side
  if (orientation === 'portrait' || templateId.startsWith('portrait_')) {
    const portraitId: PortraitTemplateId = templateId.startsWith('portrait_')
      ? (templateId as PortraitTemplateId)
      : getPairedTemplateId(templateId, 'portrait');

    return (
      <RenderPortraitTemplate
        student={student}
        schoolSettings={themedSettings}
        templateId={portraitId}
        showLogo={showLogo}
        showSignature={showSignature}
        showBarcode={showBarcode}
        visibleFields={visibleFields}
        customization={mergedCustomization}
        id={id}
        className={className}
      />
    );
  }

  // Otherwise Landscape
  const landscapeId: LandscapeTemplateId = templateId.startsWith('landscape_')
    ? (templateId as LandscapeTemplateId)
    : getPairedTemplateId(templateId, 'landscape');

  return (
    <RenderLandscapeTemplate
      student={student}
      schoolSettings={themedSettings}
      templateId={landscapeId}
      showLogo={showLogo}
      showSignature={showSignature}
      showBarcode={showBarcode}
      visibleFields={visibleFields}
      customization={mergedCustomization}
      id={id}
      className={className}
    />
  );
};
