export interface Ligand {
  Ki?: number
  EC50?: number
  IC50?: number
  XC50?: number
  AC50?: number
  Kd?: number
  assay_desc_Ki?: string; // Description for Ki
  assay_desc_EC50?: string; // Description for EC50
  assay_desc_IC50?: string; // Description for IC50
  assay_desc_XC50?: string; // Description for XC50
  assay_desc_AC50?: string; // Description for AC50
  assay_desc_Kd?: string; // Description for Kd
  
  Potency: number
  action_type: any
  activity_comment: any
  activity_id: number
  activity_properties: any[]
  assay_chembl_id: string
  assay_description: string
  assay_type: string
  assay_variant_accession: any
  assay_variant_mutation: any
  bao_endpoint: string
  bao_format: string
  bao_label: string
  canonical_smiles: string
  data_validity_comment: any
  data_validity_description: any
  document_chembl_id: string
  document_journal: string
  document_year: number
  ligand_efficiency: LigandEfficiency
  molecule_chembl_id: string
  molecule_pref_name: string
  parent_molecule_chembl_id: string
  pchembl_value: string
  potential_duplicate: number
  qudt_units: string
  record_id: number
  relation: string
  src_id: number
  standard_flag: number
  standard_relation: string
  standard_text_value: any
  standard_type: string
  standard_units: string
  standard_upper_value: any
  standard_value: string
  target_chembl_id: string
  target_organism: string
  target_pref_name: string
  target_tax_id: string
  text_value: any
  toid: any
  type: string
  units: string
  uo_units: string
  upper_value: any
  value: string
}

export interface LigandEfficiency {
  bei: string
  le: string
  lle: string
  sei: string
}
