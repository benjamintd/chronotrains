import { Adsense } from "@ctrl/react-adsense";
import React from "react";

const AdBlock = () => {
  return (
    <ErrorBoundary>
      <Adsense
        client="ca-pub-7420123397062174"
        slot="6989466712"
        format="display"
        responsive="true"
        style={{ display: "block" }}
      ></Adsense>
    </ErrorBoundary>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return <></>;
    }

    return this.props.children;
  }
}

export default AdBlock;
