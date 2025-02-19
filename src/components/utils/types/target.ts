export interface Target {
  cross_references: any[]
  organism: string
  pref_name: string
  score: number
  species_group_flag: boolean
  target_chembl_id: string
  target_components: TargetComponent[]
  target_type: string
  tax_id: number
}

export interface TargetComponent {
  accession: string
  component_description: string
  component_id: number
  component_type: string
  relationship: string
  target_component_synonyms: TargetComponentSynonym[]
  target_component_xrefs: TargetComponentXref[]
}

export interface TargetComponentSynonym {
  component_synonym: string
  syn_type: string
}

export interface TargetComponentXref {
  xref_id: string
  xref_name?: string
  xref_src_db: string
}
