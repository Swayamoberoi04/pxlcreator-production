/**
 * src/components/admin/ui/index.ts
 * Barrel export for the shared admin UI kit — every future module imports from here.
 */
export { StatusBadge, PublishStatusBadge, type StatusTone } from "./StatusBadge"
export { ToggleSwitch } from "./ToggleSwitch"
export { AdminModal } from "./AdminModal"
export { AdminDrawer } from "./AdminDrawer"
export { ConfirmDialog } from "./ConfirmDialog"
export { SearchBar } from "./SearchBar"
export { FilterBar, type FilterOption } from "./FilterBar"
export { Pagination } from "./Pagination"
export { BulkActionsBar, type BulkAction } from "./BulkActionsBar"
export { Breadcrumbs, type Crumb } from "./Breadcrumbs"
export { Skeleton, TableSkeleton, GridSkeleton, FormSkeleton } from "./Skeleton"
export { FormField, FormSection, TextInput, TextArea, Select } from "./FormField"
export { SEOForm, type SEOData } from "./SEOForm"
export { DragDropUploader } from "./DragDropUploader"
export { ImageUploader } from "./ImageUploader"
export { GalleryUploader } from "./GalleryUploader"
export { FilePicker } from "./FilePicker"
export { RichTextEditor } from "./RichTextEditor"
export { AdminDataTable, type DataTableColumn } from "./AdminDataTable"
