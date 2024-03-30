import { type Model } from './Model'

// TODO Document Reader, DefaultReader and Options
export type Reader = () => Promise<Model>
