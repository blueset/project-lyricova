declare type NodesOrName = string | HTMLElement | HTMLElement[];
export interface BalanceTextOptions {
    watch: boolean;
}
declare let publicInterface: (elements: NodesOrName, options?: BalanceTextOptions | undefined) => void;
export default publicInterface;
