import { TypeOrganisation } from "./typeorganisation";

export interface OrganisationDTO {
  name?: string;
  email: string;
  password: string;
  username?: string;
  contact?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  type?: string;
  usernamePersonneContacter?: string;
  typeOrganisation?: TypeOrganisation;

}