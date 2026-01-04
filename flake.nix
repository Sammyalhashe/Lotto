{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
        let
            pkgs = nixpkgs.legacyPackages.${system};
        in
        {
            devShells = {
                default = pkgs.mkShell {
                    packages = with pkgs; [
                        nodejs_24
                        nushell
                        solc
                        (writeScriptBin "lotto-node" ''
                            npx hardhat node
                        '')
                        (writeScriptBin "lotto-deploy" ''
                            npx hardhat ignition deploy ignition/modules/Lotto.ts --network localhost
                        '')
                        (writeScriptBin "lotto-ui" ''
                            cd frontend
                            npm run dev
                        '')
                    ];

                    shellHook = ''
                        echo "Welcome to the Lotto dev shell!"
                        echo "Available commands:"
                        echo "  lotto-node   - Start local Hardhat node"
                        echo "  lotto-deploy - Deploy contract to localhost"
                        echo "  lotto-ui     - Start React frontend"
                    '';
                };
            };
        }
    );
}
