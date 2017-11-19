import React from "react";
import Header from './Header.jsx';
import TreeDraw from './TreeDraw.jsx';
import Card from './Card.jsx';
import treeRebalancer from "../model/treeRebalancer";
import Footer from "./Footer.jsx"
import {clone} from "lodash"

const Choices = React.createClass({
  getInitialState: function () {
    return {
      Trello: clone(this.props.Trello),
      leftCard: null,
      rightCard: null,
      progress: 0,
      listNodes: clone(this.props.nodes),
      rootNode: clone(this.props.rootNode),
      blacklist: [], // the nodes to position in the tree
      node: null,
      compareNode: null,
      replay: []
    }
  },
  componentDidMount: function () {
    window.actionsHistory = [];
  },
  endChoices: function () {
    this.props.setSortedRootNode(this.state.rootNode);
  },
  executeReplay: function () {
    const nextAction = this.state.replay.shift();
    this.setState({
      replay: this.state.replay
    }, function () {
      nextAction.f(nextAction.p);
    })
  },
  autoChoice: function () { // Auto-click forgotten card
    if (this.state.replay.length > 0) {
      this.executeReplay();
    } else {
      if (this.state.blacklist.indexOf(this.state.leftCard.value.id) > -1) {
        this.cardClicked("right", "auto");
      }
      else if (this.state.blacklist.indexOf(this.state.rightCard.value.id) > -1) {
        this.cardClicked("left", "auto");
      }
    }
  },
  addToBlacklist: function (nodeId) {
    let bl = this.state.blacklist;
    bl.push(nodeId);
    this.setState({
      blacklist: bl
    }, function () {
      // window.actionsHistory.push({f: this.addToBlacklist, p: nodeId})
      this.autoChoice();
    });
  },
  handleCardClicked (side) {
    if (this.state.replay.length === 0) {
      this.cardClicked(side, "human");
    }
  },
  cardClicked: function (side, source) {
    let compareNode;
    if ("left" == side) {
      compareNode = this.state.node.goLeft(this.state.compareNode);
    }
    else if ("right" == side) {
      compareNode = this.state.node.goRight(this.state.compareNode);
    }
    this.setState({
      compareNode: compareNode,
      node: this.state.node
    }, function () {
      window.actionsHistory.push({f: this.cardClicked, p: side, s: source})
      this.handleCardPositioned();
    });
  },
  toTheNextStep: function () {
    this.setState({
      rootNode: treeRebalancer(this.state.rootNode),
      progress: Math.round(((100 * (this.props.nodes.length - this.state.listNodes.length)) / (this.props.nodes.length)))
    }, function () {
      this.nextStepOrEnd();
    });
  },
  handleCardPositioned: function () {
    if (this.state.node.isPositioned) {
      this.toTheNextStep();
    } else {
      this.getNextChoice();
    }
  },
  nextStepOrEnd: function () {
    if (0 < this.state.listNodes.length) {
      this.setState({
        node: this.state.listNodes.shift(),
        compareNode: this.state.rootNode,
        listNodes: this.state.listNodes
      }, function () {
        this.getNextChoice();
      });
    } else {
      this.endChoices();
    }
  },
  getNextChoice: function () {
    this.setState({
      leftCard: this.state.node,
      rightCard: this.state.compareNode
    }, function () {
      this.autoChoice();
    });
  },
  startChoices: function () {
    this.props.setStartTimeStamp(Date.now())
    this.nextStepOrEnd();
  },
  clearPositioned: function (cb) {
    let nodes = this.state.listNodes;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].isPositioned = false;
    }
    this.setState({
      listNodes: nodes
    }, cb());
  },
  popWithAutochoices: function () {
    let previousAction = window.actionsHistory.pop();
    while (previousAction.s === "auto") {
      previousAction = window.actionsHistory.pop();
    }
  },
  setReplay: function () {
    this.popWithAutochoices();
    // window.actionsHistory.pop();
    let comp = this;
    this.setState({
      replay: clone(window.actionsHistory)
    }, function () {
      comp.clearPositioned(function () {
        window.actionsHistory = [];
        comp.nextStepOrEnd();
      });
    })
  },
  undo: function () {
    if (window.actionsHistory.length > 0) {

      let bl = this.state.blacklist;
      this.setState(this.getInitialState(), function () {
        this.setState({
          blacklist: bl
        }, function () {
          this.setReplay()
        });
      });
    }
  },
  render: function () {
    if (this.state.leftCard == null || this.state.rightCard == null) {
      return (<span>Loading...</span>);
    }
    return (
      <div id="second_div">
        <div className="container__choose-card">
          <div className="container__top-bar">
            <div className="choose-card__heading">Select the highest priority card</div>
            <div className="container__prioritization-status">
              <div className={"progressive-bar__status-structure"}>
                <div className={"progressive-bar__status"} role="progressbar" aria-valuenow={this.state.progress}
                     aria-valuemin="0"
                     aria-valuemax="100" style={{width: this.state.progress + '%'}}>
                </div>
              </div>
            </div>
          </div>
          <Card id="left_button" side="left" handleClick={this.handleCardClicked}
                forget={this.addToBlacklist} data={this.state.leftCard.value}/>
          <Card id="right_button" side="right" handleClick={this.handleCardClicked}
                forget={this.addToBlacklist} data={this.state.rightCard.value}/>
          {/*<TreeDraw tree={this.state.rootNode}></TreeDraw>*/}

          <button onClick={this.undo} id="undo_button" className="normalize__undo-button">
            <div className="undo__button">
              <div className="undo__icon">
                <img src="assets/icons/undo-icon.svg" alt=""/>
                Undo choice
              </div>
            </div>

          </button>

        </div>

      
        <div className={"footer"}>
          <Footer/>
          <Header/>
        </div>

      </div>
    )
  }
})

export default Choices
