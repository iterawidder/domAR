import * as d3 from 'd3';
import * as _ from 'lodash';

const SLIDE_ELEMENT = "div";
const SLIDE_CLASS = "slide";

export class Slides {

    constructor(rootSelector, width, height) {
        this.rootSelector = rootSelector;
        this.root = d3.selectAll(rootSelector);
        this.width = width;
        this.height = height;
        this.slides = [];
    }

    create(num) {
        const that = this;

        this.selection()
            .data(_.range(num))
            .enter()
            .append(SLIDE_ELEMENT)
            .attr("class", SLIDE_CLASS)
            .attr("id", d => "slide-" + d)
            .style("width", this.width + "px")
            .style("height", this.height + "px");

        this.selection()
            .each(function(d, i) {
                that.slides[i] = this;
            })

        return this.selection()
    }

    getSlide(i) {
        return this.slides[i];
    }

    getAttr(i, attrName) {
        return d3.select(this.getSlide(i))
            .attr(attrName)
    }

    selection() {
        const selector = `${SLIDE_ELEMENT}.${SLIDE_CLASS}`;
        return this.root.selectAll(selector)
    }
}