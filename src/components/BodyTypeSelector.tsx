import React from "react";
import { BodyType, Payload, RawLanguage, RequestTab } from "../types/electron";

interface BodyTypeSelectorProps {
  bodyType: BodyType;
  rawLanguage: RawLanguage;
  activePayloadId: string | null;
  payloads: Payload[];
  onUpdateTab: (updates: Partial<RequestTab>) => void;
}

const BodyTypeSelector: React.FC<BodyTypeSelectorProps> = ({
  bodyType,
  rawLanguage,
  activePayloadId,
  payloads,
  onUpdateTab,
}) => (
  <div className="body-type-bar">
    {(
      [
        "none",
        "form-data",
        "x-www-form-urlencoded",
        "raw",
        "binary",
        "graphql",
      ] as BodyType[]
    ).map((bt) => (
      <label key={bt} className="body-type-option">
        <input
          type="radio"
          name="bodyType"
          checked={bodyType === bt}
          onChange={() => {
            if (activePayloadId) {
              onUpdateTab({
                bodyType: bt,
                payloads: payloads.map((p) =>
                  p.id === activePayloadId ? { ...p, bodyType: bt } : p,
                ),
              });
            } else {
              onUpdateTab({ bodyType: bt });
            }
          }}
        />
        <span>{bt}</span>
      </label>
    ))}
    {bodyType === "raw" && (
      <select
        className="raw-language-select"
        value={rawLanguage}
        onChange={(e) => {
          const lang = e.target.value as RawLanguage;
          onUpdateTab({
            rawLanguage: lang,
            payloads: payloads.map((p) =>
              p.id === activePayloadId ? { ...p, rawLanguage: lang } : p,
            ),
          });
        }}
      >
        <option value="json">JSON</option>
        <option value="text">Text</option>
        <option value="xml">XML</option>
        <option value="html">HTML</option>
        <option value="javascript">JavaScript</option>
      </select>
    )}
  </div>
);

export default BodyTypeSelector;
